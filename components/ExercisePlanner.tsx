


import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as htmlToImage from 'html-to-image';
import { DietGoal, ExercisePlan, ExercisePlanRequest, HealthEntry, FitnessLevel, ExerciseLocation } from '../types';
import { generateExercisePlan } from '../services/geminiService';
import Icon from './Icon';
import Loader from './Loader';
import Disclaimer from './Disclaimer';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../src/contexts/AuthContext';
import { exerciseService } from '../src/services/database';

const ExercisePlanner: React.FC = () => {
    const [goal, setGoal] = useState<DietGoal>('maintain-weight');
    const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('beginner');
    const [location, setLocation] = useState<ExerciseLocation>('home');
    const [timePerDay, setTimePerDay] = useState('30');
    const [plan, setPlan] = useState<ExercisePlan | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [latestHealthData, setLatestHealthData] = useState<HealthEntry | null>(null);
    const [savedPlans, setSavedPlans] = useState<any[]>([]);
    const [isLoadingPlans, setIsLoadingPlans] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [dbError, setDbError] = useState<string | null>(null);
    const planRef = useRef<HTMLDivElement>(null);
    const { language, t } = useLanguage();
    const { theme } = useTheme();
    const { user } = useAuth();

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

    useEffect(() => {
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
    }, []);

    // Load saved exercise plans from database or localStorage
    const loadSavedPlans = useCallback(async () => {
        if (user) {
            // Load from database for authenticated users
            setIsLoadingPlans(true);
            setDbError(null);
            try {
                const dbPlans = await exerciseService.getPlans(user.id);
                setSavedPlans(dbPlans);
            } catch (error) {
                console.error("Failed to load exercise plans from database:", error);
                setDbError("Failed to load saved plans from database.");
                // Fallback to localStorage could be added here if needed
            } finally {
                setIsLoadingPlans(false);
            }
        }
    }, [user]);

    useEffect(() => {
        loadSavedPlans();
    }, [loadSavedPlans]);

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
        } catch (err) {
            const message = err instanceof Error ? err.message : t('unknownError');
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [goal, latestHealthData, fitnessLevel, location, timePerDay, language, t]);

    const handleSavePlan = useCallback(async () => {
        if (!plan || !user) return;
        
        setIsSaving(true);
        try {
            const planData = {
                user_id: user.id,
                goal: goal,
                fitness_level: fitnessLevel,
                exercise_location: location,
                time_per_day_minutes: parseInt(timePerDay),
                advice: plan.advice,
                language: language,
            };

            const daysData = plan.plan.map((dailyPlan, index) => ({
                day_name: dailyPlan.day,
                details: dailyPlan.details,
                day_order: index + 1,
                exercises: dailyPlan.exercises.map((exercise, exerciseIndex) => ({
                    exercise_name: exercise.name,
                    description: exercise.description,
                    duration: exercise.duration,
                    exercise_type: exercise.type,
                    exercise_order: exerciseIndex + 1,
                }))
            }));

            await exerciseService.addPlan(planData, daysData);
            await loadSavedPlans(); // Refresh the saved plans list
            
            // Show success message (you could add a toast notification here)
            setDbError(null);
        } catch (error) {
            console.error("Failed to save exercise plan:", error);
            setDbError("Failed to save plan to database.");
        } finally {
            setIsSaving(false);
        }
    }, [plan, user, goal, fitnessLevel, location, timePerDay, language, loadSavedPlans]);
    
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
                    
                    {/* Saved Plans Section */}
                    {user && (
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-zinc-700">
                            <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('savedPlans', 'Saved Plans')}</h4>
                            
                            {/* Database Error */}
                            {dbError && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
                                    <div className="flex">
                                        <Icon name="alert-triangle" className="h-4 w-4 text-yellow-400 mt-0.5" />
                                        <div className="ml-2">
                                            <p className="text-xs text-yellow-700 dark:text-yellow-300">{dbError}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {isLoadingPlans ? (
                                <div className="flex items-center justify-center py-4">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600"></div>
                                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{t('loadingPlans', 'Loading plans...')}</span>
                                </div>
                            ) : savedPlans.length > 0 ? (
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {savedPlans.map((savedPlan) => (
                                        <div key={savedPlan.id} className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-3 border border-gray-200 dark:border-zinc-700">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-medium text-teal-600 dark:text-teal-400 px-2 py-1 bg-teal-50 dark:bg-teal-900/30 rounded">
                                                            {t(goalOptions.find(g => g.value === savedPlan.goal)?.labelKey || '')}
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {savedPlan.fitness_level} • {savedPlan.exercise_location} • {savedPlan.time_per_day_minutes}min
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {new Date(savedPlan.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{savedPlan.advice}</p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        // Load this saved plan
                                                        setGoal(savedPlan.goal);
                                                        setFitnessLevel(savedPlan.fitness_level);
                                                        setLocation(savedPlan.exercise_location);
                                                        setTimePerDay(savedPlan.time_per_day_minutes.toString());
                                                    }}
                                                    className="ml-2 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
                                                >
                                                    {t('load', 'Load')}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                    {t('noSavedPlans', 'No saved plans yet. Generate and save a plan to see it here.')}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="lg:col-span-2">
                 <div className="p-1">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t('your7DayExercisePlan')}</h3>
                        {plan && !isLoading && (
                            <div className="flex items-center gap-2">
                                {user && (
                                    <button 
                                        onClick={handleSavePlan} 
                                        disabled={isSaving}
                                        className="inline-flex items-center px-3 py-1.5 border border-teal-300 dark:border-teal-600 shadow-sm text-sm leading-5 font-medium rounded-md text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600 mr-2"></div>}
                                        <Icon name="save" className="h-5 w-5 mr-2 text-teal-500 dark:text-teal-400"/>
                                        {isSaving ? t('saving', 'Saving...') : t('save')}
                                    </button>
                                )}
                                <button onClick={handleDownloadImage} className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-zinc-700 shadow-sm text-sm leading-5 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors">
                                    <Icon name="image-download" className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400"/>
                                    {t('downloadImage')}
                                </button>
                            </div>
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