

import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as htmlToImage from 'html-to-image';
import { DietGoal, ExercisePlan, ExercisePlanRequest, HealthEntry, FitnessLevel, ExerciseLocation } from '../types';
import { generateExercisePlan } from '../services/geminiService';
import { useAuth } from '../src/contexts/AuthContext';
import { exerciseService, healthService } from '../src/services/database';
import Icon from './Icon';
import Loader from './Loader';
import Disclaimer from './Disclaimer';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../contexts/ThemeContext';

const ExercisePlanner: React.FC = () => {
    const { user } = useAuth();
    const [goal, setGoal] = useState<DietGoal>('maintain-weight');
    const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('beginner');
    const [location, setLocation] = useState<ExerciseLocation>('home');
    const [timePerDay, setTimePerDay] = useState('30');
    const [plan, setPlan] = useState<ExercisePlan | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [latestHealthData, setLatestHealthData] = useState<HealthEntry | null>(null);
    const [savedPlans, setSavedPlans] = useState<ExercisePlan[]>([]);
    const [showPlanHistory, setShowPlanHistory] = useState(false);
    const planRef = useRef<HTMLDivElement>(null);
    const { language, t } = useLanguage();
    const { theme } = useTheme();

    const goalOptions: { value: DietGoal; labelKey: string }[] = [
        { value: 'weight-loss', labelKey: 'goalWeightLoss' },
        { value: 'maintain-weight', labelKey: 'goalMaintainWeight' },
        { value: 'muscle-gain', labelKey: 'goalMuscleGain' },
        { value: 'weight-gain', labelKey: 'goalWeightGain' },
    ];
    
    const fitnessLevelOptions: { value: FitnessLevel; labelKey: string }[] = [
        { value: 'beginner', labelKey: 'fitnessBeginner' },
        { value: 'intermediate', labelKey: 'fitnessIntermediate' },
        { value: 'advanced', labelKey: 'fitnessAdvanced' },
    ];
    
    const locationOptions: { value: ExerciseLocation; labelKey: string }[] = [
        { value: 'home', labelKey: 'locationHome' },
        { value: 'gym', labelKey: 'locationGym' },
    ];
    
    const timeOptions: { value: string; labelKey: string }[] = [
        { value: '30', labelKey: 'time30min' },
        { value: '45', labelKey: 'time45min' },
        { value: '60', labelKey: 'time60min' },
    ];

    // Load health data and saved plans
    useEffect(() => {
        loadHealthData();
        loadSavedPlans();
    }, [user]);

    const loadHealthData = useCallback(async () => {
        if (user) {
            // Load from database for authenticated users
            try {
                const dbEntries = await healthService.getEntries(user.id);
                if (dbEntries.length > 0) {
                    const latestEntry = dbEntries[0]; // Already ordered by date desc
                    const formattedEntry: HealthEntry = {
                        date: latestEntry.date,
                        age: latestEntry.age,
                        height: latestEntry.height_cm,
                        weight: latestEntry.weight_kg,
                        bmi: latestEntry.bmi,
                    };
                    setLatestHealthData(formattedEntry);
                }
            } catch (error) {
                console.error("Failed to load health data from database:", error);
                // Fallback to localStorage
                loadHealthDataFromLocalStorage();
            }
        } else {
            // Load from localStorage for non-authenticated users
            loadHealthDataFromLocalStorage();
        }
    }, [user]);

    const loadHealthDataFromLocalStorage = () => {
        try {
            const storedHistory = localStorage.getItem('healthHistory');
            if (storedHistory) {
                const history: HealthEntry[] = JSON.parse(storedHistory);
                if (history.length > 0) {
                    setLatestHealthData(history[history.length - 1]);
                }
            }
        } catch (error) {
            console.error("Failed to parse health history for exercise planner", error);
        }
    };

    const loadSavedPlans = useCallback(async () => {
        if (user) {
            try {
                const dbPlans = await exerciseService.getPlans(user.id);
                const formattedPlans: ExercisePlan[] = dbPlans.map(dbPlan => ({
                    summary: dbPlan.summary,
                    plan: dbPlan.exercise_plan_days?.map(day => ({
                        day: day.day_name,
                        details: day.details || '',
                        exercises: day.exercise_plan_exercises?.map(exercise => ({
                            name: exercise.exercise_name,
                            description: exercise.description || '',
                            duration: exercise.duration || '',
                            type: exercise.exercise_type || 'cardio',
                        })) || [],
                    })) || [],
                }));
                setSavedPlans(formattedPlans);
            } catch (error) {
                console.error("Failed to load saved exercise plans:", error);
            }
        }
    }, [user]);

    const handleGeneratePlan = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setPlan(null);

        if (!latestHealthData) {
            setError(t('noHealthDataError'));
            setIsLoading(false);
            return;
        }

        const request: ExercisePlanRequest = { 
            goal, 
            healthData: latestHealthData,
            fitnessLevel,
            location,
            timePerDay: `${timePerDay} minutes`
        };

        try {
            const newPlan = await generateExercisePlan(request, language);
            setPlan(newPlan);

            // Save to database if user is authenticated
            if (user) {
                try {
                    const daysData = newPlan.plan.map((day, index) => ({
                        day_name: day.day,
                        details: day.details,
                        day_order: index + 1,
                        exercises: day.exercises.map((exercise, exerciseIndex) => ({
                            exercise_name: exercise.name,
                            description: exercise.description,
                            duration: exercise.duration,
                            exercise_type: exercise.type,
                            exercise_order: exerciseIndex + 1,
                        })),
                    }));

                    await exerciseService.addPlan({
                        user_id: user.id,
                        goal: goal,
                        fitness_level: fitnessLevel,
                        location: location,
                        time_per_day: `${timePerDay} minutes`,
                        summary: newPlan.summary,
                        language: language,
                    }, daysData);

                    // Reload saved plans to include the new one
                    await loadSavedPlans();
                    console.log('Exercise plan saved to database successfully');
                } catch (saveError) {
                    console.error('Failed to save exercise plan to database:', saveError);
                    setError('Plan generated successfully, but failed to save to database for future access.');
                }
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : t('unknownError');
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [goal, latestHealthData, fitnessLevel, location, timePerDay, language, t, user, loadSavedPlans]);
    
    const exerciseTypeColors: {[key: string]: string} = {
        'Cardio': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        'Strength': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        'Flexibility': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        'কার্ডিেও': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        'শক্তি': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        'নমনীয়তা': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    }
    
    const handleDownloadImage = useCallback(() => {
        const node = planRef.current;
        if (node === null) return;
        
        htmlToImage.toCanvas(node, { 
            cacheBust: true, 
            backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', 
            pixelRatio: 2,
            width: node.offsetWidth,
            height: node.scrollHeight,
        })
            .then((canvas) => {
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                // Watermark
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                const fontSize = canvas.width / 60;
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.fillText('পরামর্শক AI', canvas.width - (fontSize), canvas.height - (fontSize));

                // Download
                const link = document.createElement('a');
                link.download = '7-day-exercise-plan.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
              }).catch((err) => {
                console.error('oops, something went wrong!', err);
                alert("Sorry, could not download image.");
              });
      }, [theme]);


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
            <div className="lg:col-span-1">
                <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-xl border border-gray-200/80 dark:border-zinc-800/80 sticky top-28 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('createYourExercisePlan')}</h3>
                    <form onSubmit={handleGeneratePlan} className="space-y-4">
                        <div>
                            <label htmlFor="goal" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t('healthGoalLabel')}</label>
                            <select id="goal" value={goal} onChange={e => setGoal(e.target.value as DietGoal)} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2.5">
                                {goalOptions.map(opt => <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>)}
                            </select>
                        </div>
                        
                         <div>
                            <label htmlFor="fitnessLevel" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t('fitnessLevelLabel')}</label>
                            <select id="fitnessLevel" value={fitnessLevel} onChange={e => setFitnessLevel(e.target.value as FitnessLevel)} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2.5">
                                {fitnessLevelOptions.map(opt => <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>)}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t('locationLabel')}</label>
                            <select id="location" value={location} onChange={e => setLocation(e.target.value as ExerciseLocation)} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2.5">
                                {locationOptions.map(opt => <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>)}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="timePerDay" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t('timePerDayLabel')}</label>
                            <select id="timePerDay" value={timePerDay} onChange={e => setTimePerDay(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2.5">
                                {timeOptions.map(opt => <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>)}
                            </select>
                        </div>

                        {latestHealthData?.age ? (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/50 text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2 rounded-md">
                                <Icon name="info" className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                <span>{t('usingLatestHealthData', { age: latestHealthData.age, bmi: latestHealthData.bmi.toFixed(2) })}</span>
                            </div>
                        ) : (
                             <div className="p-3 bg-yellow-50 dark:bg-yellow-900/50 text-sm text-yellow-800 dark:text-yellow-300 flex items-start gap-2 rounded-md">
                                <Icon name="info" className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                <span>{t('noHealthDataForExercise')}</span>
                            </div>
                        )}
                        <button type="submit" className="w-full bg-teal-500 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-teal-600 transition duration-200 disabled:opacity-60" disabled={isLoading || !latestHealthData?.age}>
                            {isLoading ? t('generating') : t('generatePlan')}
                        </button>
                    </form>
                </div>
            </div>
            <div className="lg:col-span-2">
                 <div className="p-1">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t('your7DayExercisePlan')}</h3>
                        {plan && !isLoading && (
                            <button onClick={handleDownloadImage} className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-zinc-700 shadow-sm text-sm leading-5 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors">
                                <Icon name="image-download" className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400"/>
                                {t('downloadImage')}
                            </button>
                         )}
                    </div>
                    
                    {isLoading && <div className="flex justify-center items-center h-64"><Loader /></div>}
                    {error && <div className="text-center text-red-600 dark:text-red-400 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-500/30"><p><strong>{t('errorLabel')}:</strong> {error}</p></div>}
                    {!isLoading && !error && !plan && (
                        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                            <Icon name="exercise" className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="font-medium">{t('planWillAppearHere')}</p>
                            <p className="text-sm mt-1">{t('selectGoalsForExercise')}</p>
                        </div>
                    )}
                    {plan && (
                       <div ref={planRef} className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200/80 dark:border-zinc-800/80 p-4 sm:p-6 space-y-6">
                            <div className="bg-teal-50 dark:bg-teal-900/30 p-4 rounded-lg border border-teal-200 dark:border-teal-500/30">
                                <div className="flex items-center mb-2">
                                    <Icon name="lightbulb" className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                                    <h4 className="ml-3 font-semibold text-teal-800 dark:text-teal-300">{t('personalizedAdviceTitle')}</h4>
                                </div>
                                <p className="text-sm text-teal-700 dark:text-teal-400">{plan.advice}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {plan.plan.map((dailyPlan) => (
                                    <div key={dailyPlan.day} className="bg-gray-50/80 dark:bg-zinc-800/50 rounded-lg p-4 border border-gray-200/60 dark:border-zinc-800/60 flex flex-col">
                                        <div className="mb-3">
                                            <h4 className="font-bold text-gray-800 dark:text-gray-200 text-md">{dailyPlan.day}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{dailyPlan.details}</p>
                                        </div>
                                        <div className="space-y-4">
                                            {dailyPlan.exercises.map((exercise, i) => (
                                                <div key={i} className="pl-2 border-l-2 border-teal-200 dark:border-teal-700">
                                                    <div className="flex justify-between items-baseline">
                                                        <h5 className="font-semibold text-gray-800 dark:text-gray-300">{exercise.name}</h5>
                                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${exerciseTypeColors[exercise.type] || 'bg-gray-100 text-gray-800'}`}>{exercise.type}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{exercise.description}</p>
                                                    <p className="text-sm font-medium text-teal-700 dark:text-teal-400 mt-1">{exercise.duration}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Disclaimer />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExercisePlanner;