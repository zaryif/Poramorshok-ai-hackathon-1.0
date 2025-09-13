import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as htmlToImage from 'html-to-image';
import { SymptomAnalysis, ChatMessage } from '../types';
import { analyzeSymptoms } from '../services/geminiService';
import Icon from './Icon';
import Disclaimer from './Disclaimer';
import Loader from './Loader';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../contexts/ThemeContext';

const AnalysisResultCard: React.FC<{ title: string; items: string[]; icon: 'symptom' | 'cause' | 'treatment' | 'medication' }> = ({ title, items, icon }) => {
    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200/80 dark:border-zinc-800/80 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col h-full">
            <div className="flex items-center mb-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <Icon name={icon} className="h-5 w-5" />
                </div>
                <h3 className="ml-3 font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 list-disc pl-5">
                {items.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
        </div>
    );
};

const MentalHealthSupportCard: React.FC<{ items: string[] }> = ({ items }) => {
    const { t } = useLanguage();
    return (
        <div className="md:col-span-2 bg-purple-50 dark:bg-purple-900/30 rounded-xl border border-purple-200 dark:border-purple-500/30 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center mb-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Icon name="mental-health" className="h-5 w-5" />
                </div>
                <h3 className="ml-3 font-semibold text-purple-800 dark:text-purple-300">{t('mentalHealthSupport')}</h3>
            </div>
            <ul className="space-y-2 text-sm text-purple-700 dark:text-purple-300 list-disc pl-5">
                {items.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
        </div>
    );
};


const Chatbot: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        try {
            const storedMessages = localStorage.getItem('chatHistory');
            return storedMessages ? JSON.parse(storedMessages) : [];
        } catch (error) {
            console.error("Failed to parse chat history from localStorage", error);
            localStorage.removeItem('chatHistory');
            return [];
        }
    });
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const { language, t } = useLanguage();
    const { theme } = useTheme();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (!isLoading) {
            scrollToBottom();
        }
    }, [messages, isLoading]);

    useEffect(() => {
        try {
            localStorage.setItem('chatHistory', JSON.stringify(messages));
        } catch (err) {
            console.error("Failed to save chat history to localStorage", err);
        }
    }, [messages]);
    
    const handleDownloadChat = useCallback(() => {
        const node = chatContainerRef.current;
        if (node === null) {
          return;
        }
        
        setIsDownloading(true);

        htmlToImage.toCanvas(node, {
            cacheBust: true,
            backgroundColor: theme === 'dark' ? '#0a0a0e' : '#f3f4f6', // zinc-950 or gray-100
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
            link.download = 'ai-analyzer-chat.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
          })
          .catch((err) => {
            console.error('oops, something went wrong!', err);
            alert('Sorry, could not download chat image.');
          })
          .finally(() => {
            setIsDownloading(false);
          });
    }, [theme]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { sender: 'user', text: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const analysis = await analyzeSymptoms(input, language);
            const aiMessage: ChatMessage = { sender: 'ai', text: t('aiAnalysisDisclaimer'), analysis };
            setMessages((prev) => [...prev, aiMessage]);
        } catch (err) {
            const message = err instanceof Error ? err.message : t('unknownError');
            setError(message);
            setMessages((prev) => [...prev, { sender: 'ai', text: `${t('aiProcessError')} ${message}` }]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, language, t]);

    return (
        <div className="flex flex-col animate-fade-in-up">
            <div className="flex-1 p-1 sm:p-4">
                 {/* Chat Header */}
                <div className="max-w-4xl mx-auto mb-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                        {messages.length > 0 ? t('conversation') : t('symptomAnalyzerTitle')}
                    </h2>
                    {messages.length > 0 && (
                        <button 
                            onClick={handleDownloadChat} 
                            disabled={isDownloading} 
                            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white bg-teal-500 hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all disabled:opacity-70 disabled:cursor-wait"
                        >
                            {isDownloading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>{t('downloading')}</span>
                                </>
                            ) : (
                                <>
                                    <Icon name="image-download" className="h-5 w-5"/>
                                    <span>{t('downloadChat')}</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                <div ref={chatContainerRef} className="space-y-6 max-w-4xl mx-auto pb-28 pt-4 bg-gray-100 dark:bg-zinc-950">
                    {messages.length === 0 && (
                         <div className="text-center text-gray-500 dark:text-gray-400 pt-16 flex flex-col items-center justify-center">
                            <Icon name="search" className="h-20 w-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="mt-2 max-w-sm">{t('symptomAnalyzerDescription')}</p>
                        </div>
                    )}
                    {messages.map((msg, index) => (
                        <div key={index}>
                            <div className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.sender === 'ai' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-teal-500 flex items-center justify-center text-white shadow-sm"><Icon name="logo" className="h-5 w-5" /></div>}
                                <div className={`max-w-2xl px-4 py-2.5 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-500 dark:bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-200/80 dark:border-zinc-800/80'}`}>
                                    <p className="text-base">{msg.text}</p>
                                </div>
                            </div>
                             {msg.analysis && (
                                 <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl ml-11">
                                    <AnalysisResultCard title={t('identifiedSymptoms')} items={msg.analysis.symptoms} icon="symptom" />
                                    <AnalysisResultCard title={t('potentialCauses')} items={msg.analysis.causes} icon="cause" />
                                    <AnalysisResultCard title={t('suggestedTreatments')} items={msg.analysis.treatments} icon="treatment" />
                                    <AnalysisResultCard title={t('possibleMedications')} items={msg.analysis.medications} icon="medication" />
                                    {msg.analysis.mentalHealthSupport && msg.analysis.mentalHealthSupport.length > 0 && (
                                        <MentalHealthSupportCard items={msg.analysis.mentalHealthSupport} />
                                    )}
                                    <div className="md:col-span-2"><Disclaimer /></div>
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-end gap-3 justify-start">
                           <div className="flex-shrink-0 h-8 w-8 rounded-full bg-teal-500 flex items-center justify-center text-white shadow-sm"><Icon name="logo" className="h-5 w-5" /></div>
                            <div className="max-w-md p-3 rounded-2xl rounded-bl-none bg-white dark:bg-zinc-800 border border-gray-200/80 dark:border-zinc-800/80">
                                <Loader />
                            </div>
                        </div>
                    )}
                     {error && !isLoading && (
                        <div className="text-center text-red-600 dark:text-red-400 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-500/30">
                           <p><strong>{t('errorLabel')}:</strong> {error}</p>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="p-4 bg-gray-100/80 dark:bg-zinc-950/80 backdrop-blur-sm border-t border-gray-200/80 dark:border-zinc-800/80 sticky bottom-0">
                <div className="max-w-4xl mx-auto">
                    <form onSubmit={handleSubmit} className="flex items-center space-x-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={t('symptomInputPlaceholder')}
                            className="flex-1 block w-full rounded-full border-gray-300 dark:border-zinc-700 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-3 pl-5 bg-white dark:bg-zinc-800 dark:text-gray-200 dark:placeholder-gray-400"
                            disabled={isLoading}
                            aria-label={t('symptomInputPlaceholder')}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="inline-flex items-center justify-center rounded-full h-12 w-12 border border-transparent bg-teal-500 text-white shadow-sm hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label={t('sendMessage')}
                        >
                            <Icon name="send" className="h-5 w-5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;