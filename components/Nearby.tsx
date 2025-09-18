import React, { useState, useCallback } from 'react';
import { Hospital } from '../types';
import { findNearbyHospitals } from '../services/geminiService';
import { useLanguage } from '../hooks/useLanguage';
import Icon from './Icon';
import Loader from './Loader';

const Nearby: React.FC = () => {
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSearched, setIsSearched] = useState(false);
    const { language, t } = useLanguage();

    const handleFindHospitals = useCallback(() => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser.");
            return;
        }

        setIsLoading(true);
        setIsSearched(true);
        setError(null);
        setHospitals([]);
        setLoadingMessage(t('findingYourLocation'));

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setLoadingMessage(t('fetchingHospitals'));
                try {
                    const nearbyHospitals = await findNearbyHospitals(latitude, longitude, language);
                    setHospitals(nearbyHospitals);
                } catch (err) {
                    const message = err instanceof Error ? err.message : t('unknownError');
                    setError(message);
                } finally {
                    setIsLoading(false);
                }
            },
            (geoError) => {
                switch (geoError.code) {
                    case geoError.PERMISSION_DENIED:
                        setError(t('locationPermissionDenied'));
                        break;
                    case geoError.POSITION_UNAVAILABLE:
                    case geoError.TIMEOUT:
                        setError(t('unableToFetchLocation'));
                        break;
                    default:
                        setError(t('unknownError'));
                        break;
                }
                setIsLoading(false);
            }
        );
    }, [language, t]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="text-center py-20">
                    <div className="flex justify-center items-center">
                        <Loader />
                    </div>
                     <p className="mt-4 text-gray-600 dark:text-gray-400">{loadingMessage}</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-center py-20 px-4">
                    <Icon name="info-circle" className="h-12 w-12 text-red-400 mx-auto mb-4"/>
                    <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">{error}</h3>
                    {error === t('locationPermissionDenied') && (
                         <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">{t('howToEnableLocation')}</p>
                    )}
                </div>
            );
        }

        if (isSearched && hospitals.length === 0) {
             return (
                <div className="text-center py-20 px-4">
                    <Icon name="search" className="h-12 w-12 text-gray-400 mx-auto mb-4"/>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('noHospitalsFound')}</h3>
                </div>
            );
        }
        
        if (hospitals.length > 0) {
            return (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hospitals.map((hospital, index) => (
                        <div key={index} className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200/80 dark:border-zinc-800/80 p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                            <div>
                                <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200">{hospital.name}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{hospital.address}</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800 space-y-2 flex flex-col">
                                {hospital.phone && (
                                     <a href={`tel:${hospital.phone}`} className="w-full text-center px-4 py-2 text-sm font-semibold rounded-lg bg-teal-500 text-white hover:bg-teal-600 transition flex items-center justify-center gap-2">
                                        <Icon name="phone" className="w-4 h-4" />
                                        {t('callHospital')}
                                    </a>
                                )}
                                 {hospital.ambulancePhone && (
                                     <a href={`tel:${hospital.ambulancePhone}`} className="w-full text-center px-4 py-2 text-sm font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition flex items-center justify-center gap-2">
                                         <Icon name="phone" className="w-4 h-4" />
                                        {t('callAmbulance')}
                                    </a>
                                )}
                                <a href={`https://www.google.com/maps/search/?api=1&query=${hospital.latitude},${hospital.longitude}`} target="_blank" rel="noopener noreferrer" className="w-full text-center px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition">
                                    {t('getDirections')}
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="text-center py-20 flex flex-col items-center justify-center">
                <Icon name="hospital" className="h-20 w-20 text-gray-300 dark:text-gray-600 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t('nearbyHospitalsTitle')}</h2>
                <p className="mt-2 max-w-md mx-auto text-gray-600 dark:text-gray-400">{t('nearbyHospitalsDescription')}</p>
                <button
                    onClick={handleFindHospitals}
                    className="mt-6 inline-flex items-center justify-center rounded-lg px-6 py-3 border border-transparent bg-teal-500 text-base font-medium text-white shadow-sm hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
                >
                    {t('findNearbyHospitals')}
                </button>
            </div>
        );
    };

    return (
        <div className="animate-fade-in-up py-6">
            {renderContent()}
        </div>
    );
};

export default Nearby;
