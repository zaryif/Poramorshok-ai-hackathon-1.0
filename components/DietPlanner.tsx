import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as htmlToImage from 'html-to-image';
import { DietGoal, DietaryPreference, DietPlan, DietPlanRequest, HealthEntry } from '../types';
import { generateDietPlan } from '../services/geminiService';
import { useAuth } from '../src/contexts/AuthContext';
import { dietService, healthService } from '../src/services/database';
import Icon from './Icon';
import Loader from './Loader';
import Disclaimer from './Disclaimer';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../contexts/ThemeContext';

const DietPlanner: React.FC = () => {
    const { user } = useAuth();
    const [goal, setGoal] = useState<DietGoal>('maintain-weight');
    const [preference, setPreference] = useState<DietaryPreference>('non-vegetarian');
    const [plan, setPlan] = useState<DietPlan | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [latestHealthData, setLatestHealthData] = useState<HealthEntry | null>(null);
    const [savedPlans, setSavedPlans] = useState<DietPlan[]>([]);
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

    const preferenceOptions: { value: DietaryPreference; labelKey: string }[] = [
        { value: 'non-vegetarian', labelKey: 'prefNonVegetarian' },
        { value: 'vegetarian', labelKey: 'prefVegetarian' },
        { value: 'vegan', labelKey: 'prefVegan' },
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
            console.error("Failed to parse health history for diet planner", error);
        }
    };

    const loadSavedPlans = useCallback(async () => {
        if (user) {
            try {
                const dbPlans = await dietService.getPlans(user.id);
                const formattedPlans: DietPlan[] = dbPlans.map(dbPlan => ({
                    summary: dbPlan.summary,
                    plan: dbPlan.diet_plan_days?.map(day => ({
                        day: day.day_name,
                        dailyNote: day.daily_note || '',
                        meals: day.diet_plan_meals?.map(meal => ({
                            name: meal.meal_name,
                            items: meal.meal_items || [],
                        })) || [],
                    })) || [],
                }));
                setSavedPlans(formattedPlans);
            } catch (error) {
                console.error("Failed to load saved diet plans:", error);
            }
        }
    }, [user]);
    
    const handleDownload = useCallback(() => {
        if (!plan) return;

        let content = `# ${t('your7DayDietPlan')}\n\n`;
        content += `**${t('healthGoalLabel')}:** ${t(goalOptions.find(g => g.value === goal)?.labelKey || '')}\n`;
        content += `**${t('dietaryPreferenceLabel')}:** ${t(preferenceOptions.find(p => p.value === preference)?.labelKey || '')}\n\n`;
        content += `## ${t('planSummary')}\n${plan.summary}\n\n`;
        content += '---\n\n';

        plan.plan.forEach(dailyPlan => {
            content += `## ${dailyPlan.day}\n\n`;
            content += `**${t('dailyNote')}:** ${dailyPlan.dailyNote}\n\n`;
            dailyPlan.meals.forEach(meal => {
                content += `### ${meal.name}\n`;
                meal.items.forEach(item => {
                    content += `- ${item}\n`;
                });
                content += '\n';
            });
            content += '---\n\n';
        });
        
        const disclaimerText = language === 'en' 
            ? "Disclaimer: The information provided by পরামর্শক AI is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition."
            : "দাবিত্যাগ: পরামর্শক AI দ্বারা প্রদত্ত তথ্য শুধুমাত্র তথ্যগত উদ্দেশ্যে এবং পেশাদার চিকিৎসা পরামর্শ, রোগ নির্ণয় বা চিকিৎসার বিকল্প নয়। যেকোনো চিকিৎসা সংক্রান্ত প্রশ্ন থাকলে সর্বদা আপনার চিকিৎসক বা অন্য যোগ্য স্বাস্থ্য প্রদানকারীর পরামর্শ নিন।";

        content += `\n\n_${disclaimerText}_`;

        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '7-Day-Diet-Plan.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [plan, goal, preference, t, language, goalOptions, preferenceOptions]);

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
                link.download = '7-day-diet-plan.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
              }).catch((err) => {
                console.error('oops, something went wrong!', err);
                alert("Sorry, could not download image.");
              });
      }, [theme]);

    const handleGeneratePlan = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setPlan(null);

        const request: DietPlanRequest = { goal, preference, healthData: latestHealthData };

        try {
            const newPlan = await generateDietPlan(request, language);
            setPlan(newPlan);

            // Save to database if user is authenticated
            if (user) {
                try {
                    const daysData = newPlan.plan.map((day, index) => ({
                        day_name: day.day,
                        daily_note: day.dailyNote,
                        day_order: index + 1,
                        meals: day.meals.map((meal, mealIndex) => ({
                            meal_name: meal.name,
                            meal_items: meal.items,
                            meal_order: mealIndex + 1,
                        })),
                    }));

                    await dietService.addPlan({
                        user_id: user.id,
                        goal: goal,
                        dietary_preference: preference,
                        summary: newPlan.summary,
                        language: language,
                    }, daysData);

                    // Reload saved plans to include the new one
                    await loadSavedPlans();
                    console.log('Diet plan saved to database successfully');
                } catch (saveError) {
                    console.error('Failed to save diet plan to database:', saveError);
                    setError('Plan generated successfully, but failed to save to database for future access.');
                }
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : t('unknownError');
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [goal, preference, latestHealthData, language, t, user, loadSavedPlans]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
            <div className="lg:col-span-1">
                <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-xl border border-gray-200/80 dark:border-zinc-800/80 sticky top-28 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('createYourPlan')}</h3>
                    <form onSubmit={handleGeneratePlan} className="space-y-4">
                        <div>
                            <label htmlFor="goal" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t('healthGoalLabel')}</label>
                            <select id="goal" value={goal} onChange={e => setGoal(e.target.value as DietGoal)} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2.5">
                                {goalOptions.map(opt => <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="preference" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t('dietaryPreferenceLabel')}</label>
                            <select id="preference" value={preference} onChange={e => setPreference(e.target.value as DietaryPreference)} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2.5">
                                {preferenceOptions.map(opt => <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>)}
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
                         <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t('your7DayPlan')}</h3>
                         {plan && !isLoading && (
                            <div className="flex items-center gap-2">
                                <button onClick={handleDownloadImage} className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-zinc-700 shadow-sm text-sm leading-5 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors">
                                    <Icon name="image-download" className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400"/>
                                    {t('image')}
                                </button>
                                <button onClick={handleDownload} className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-zinc-700 shadow-sm text-sm leading-5 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors">
                                    <Icon name="download" className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400"/>
                                    {t('plan')}
                                </button>
                            </div>
                         )}
                    </div>
                   
                    {isLoading && <div className="flex justify-center items-center h-64"><Loader /></div>}
                    {error && <div className="text-center text-red-600 dark:text-red-400 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-500/30"><p><strong>{t('errorLabel')}:</strong> {error}</p></div>}
                    {!isLoading && !error && !plan && (
                        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                            <Icon name="plan" className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="font-medium">{t('planWillAppearHere')}</p>
                            <p className="text-sm mt-1">{t('selectGoalsForDiet')}</p>
                        </div>
                    )}
                    {plan && (
                       <div ref={planRef} className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200/80 dark:border-zinc-800/80 p-4 sm:p-6 space-y-6">
                           <div>
                                <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('planSummary')}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{plan.summary}</p>
                           </div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                               {plan.plan.map((dailyPlan) => (
                                   <div key={dailyPlan.day} className="bg-gray-50/80 dark:bg-zinc-800/50 rounded-lg p-4 border border-gray-200/60 dark:border-zinc-800/60 flex flex-col">
                                       <h4 className="font-bold text-gray-800 dark:text-gray-200 text-md mb-3">{dailyPlan.day}</h4>
                                       <div className="mb-4 pl-2 border-l-2 border-teal-200 dark:border-teal-700">
                                            <p className="text-xs text-gray-600 dark:text-gray-400 italic">"{dailyPlan.dailyNote}"</p>
                                       </div>
                                       <div className="space-y-4">
                                           {dailyPlan.meals.map((meal) => (
                                               <div key={meal.name}>
                                                   <h5 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{meal.name}</h5>
                                                   <ul className="list-disc list-outside pl-5 mt-1 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                                       {meal.items.map((item, i) => <li key={i}>{item}</li>)}
                                                   </ul>
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

export default DietPlanner;