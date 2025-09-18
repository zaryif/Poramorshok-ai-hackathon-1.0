import React, { useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MedicalRecord, Prescription, Insurance, Drug } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../src/contexts/AuthContext';
import { medicalRecordsService, prescriptionsService, insuranceService } from '../src/services/database';
import Icon from './Icon';
import { useReminders } from '../contexts/ReminderContext';

const fileToBase64 = (file: File): Promise<{ data: string; type: string; name: string; }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve({ data: reader.result as string, type: file.type, name: file.name });
    reader.onerror = error => reject(error);
  });
};

type ModalType = 'record' | 'prescription' | 'insurance' | null;

interface ModalState {
    isOpen: boolean;
    type: ModalType;
    data?: Insurance; // For editing
}


const ActionButton: React.FC<{onClick: React.MouseEventHandler<HTMLButtonElement>; children: React.ReactNode;}> = ({ onClick, children }) => (
    <button 
        onClick={onClick} 
        className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-full transition-colors duration-200 bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:hover:bg-teal-900/80 dark:text-teal-300"
    >
        {children}
    </button>
);

const Accordion: React.FC<{ title: string; icon: string; children: ReactNode; actionButton?: ReactNode }> = ({ title, icon, children, actionButton }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200/80 dark:border-zinc-800/80 transition-all duration-300 hover:shadow-lg">
            <div className="flex items-center p-4 sm:p-5">
                <button
                    className="flex items-center flex-grow text-left focus:outline-none"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-expanded={isOpen}
                >
                    <Icon name={icon} className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                    <h3 className="ml-3 text-lg font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
                    <Icon name="chevron-down" className={`h-5 w-5 text-gray-500 dark:text-gray-400 ml-auto transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                 <div className="pl-3 flex-shrink-0">
                    {actionButton}
                </div>
            </div>

            <div className={`accordion-content ${isOpen ? 'accordion-open' : ''}`}>
                <div className="accordion-content-inner">
                    <div className="p-4 sm:p-5 border-t border-gray-200/80 dark:border-zinc-800/80">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};


const HealthWallet: React.FC = () => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const { permissionStatus, requestPermission, scheduleReminders } = useReminders();
    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [insurance, setInsurance] = useState<Insurance | null>(null);
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, type: null });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [formValues, setFormValues] = useState<any>({ drugs: [{ id: Date.now().toString(), name: '', dosage: '', reminderEnabled: false, reminderTimes: [] }] });
    const [formFile, setFormFile] = useState<{ data: string; type: string; name: string; } | null>(null);
    const [formErrors, setFormErrors] = useState<{ [key: string]: string | { [key: string]: string } }>({});

    // Load data from database or localStorage fallback
    const loadData = useCallback(async () => {
        if (user) {
            // Load from database for authenticated users
            setLoading(true);
            setError(null);
            try {
                // Load medical records
                const dbRecords = await medicalRecordsService.getRecords(user.id);
                const formattedRecords: MedicalRecord[] = dbRecords.map(record => ({
                    id: record.id,
                    name: record.name,
                    date: record.issue_date,
                    fileData: record.file_data,
                    fileType: record.file_type,
                }));
                setRecords(formattedRecords);

                // Load prescriptions
                const dbPrescriptions = await prescriptionsService.getPrescriptions(user.id);
                const formattedPrescriptions: Prescription[] = dbPrescriptions.map(prescription => ({
                    id: prescription.id,
                    doctor: prescription.prescribing_doctor,
                    date: prescription.issue_date,
                    drugs: prescription.prescription_drugs?.map(drug => ({
                        id: drug.id,
                        name: drug.drug_name,
                        dosage: drug.dosage,
                        reminderEnabled: drug.reminder_enabled || false,
                        reminderTimes: drug.drug_reminder_times?.map(rt => rt.reminder_time) || [],
                    })) || [],
                    fileData: prescription.file_data,
                    fileType: prescription.file_type,
                }));
                setPrescriptions(formattedPrescriptions);

                // Load insurance
                const dbInsurance = await insuranceService.getInsurance(user.id);
                if (dbInsurance) {
                    const formattedInsurance: Insurance = {
                        id: dbInsurance.id,
                        provider: dbInsurance.provider_name,
                        policyNumber: dbInsurance.policy_number,
                        contact: dbInsurance.contact_info || '',
                        fileData: dbInsurance.file_data,
                        fileType: dbInsurance.file_type,
                    };
                    setInsurance(formattedInsurance);
                }
            } catch (error) {
                console.error("Failed to load health wallet data from database:", error);
                setError("Failed to load data from database. Using local storage.");
                // Fallback to localStorage
                loadFromLocalStorage();
            } finally {
                setLoading(false);
            }
        } else {
            // Load from localStorage for non-authenticated users
            loadFromLocalStorage();
        }
    }, [user]);

    const loadFromLocalStorage = () => {
        try {
            const storedRecords = localStorage.getItem('medicalRecords');
            if (storedRecords) setRecords(JSON.parse(storedRecords));

            const storedPrescriptions = localStorage.getItem('prescriptions');
            if (storedPrescriptions) setPrescriptions(JSON.parse(storedPrescriptions));

            const storedInsurance = localStorage.getItem('insurance');
            if (storedInsurance) setInsurance(JSON.parse(storedInsurance));
        } catch (error) { 
            console.error("Failed to load from localStorage", error); 
        }
    };

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCloseModal = useCallback(() => {
        setModalState({ isOpen: false, type: null });
        resetForm();
    }, []);
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleCloseModal();
            }
        };

        if (modalState.isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [modalState.isOpen, handleCloseModal]);

    // Effect to lock body scroll when modal is open
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        if (modalState.isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, [modalState.isOpen]);


    const saveData = useCallback(async (key: string, data: any) => {
        if (user) {
            // Save to database for authenticated users
            try {
                if (key === 'prescriptions') {
                    // We don't need to save prescriptions array here as individual prescriptions are saved in handleSave
                    scheduleReminders();
                } else if (key === 'insurance') {
                    // Individual insurance is saved in handleSave
                } else if (key === 'medicalRecords') {
                    // Individual records are saved in handleSave
                }
            } catch (error) {
                console.error(`Failed to save ${key} to database:`, error);
                setError(`Failed to save ${key} to database. Saving to local storage as backup.`);
                // Fallback to localStorage
                localStorage.setItem(key, JSON.stringify(data));
            }
        } else {
            // Save to localStorage for non-authenticated users
            localStorage.setItem(key, JSON.stringify(data));
        }
        
        if (key === 'prescriptions') {
            scheduleReminders();
        }
    }, [user, scheduleReminders]);

    const resetForm = () => {
        setFormValues({ drugs: [{ id: Date.now().toString(), name: '', dosage: '', reminderEnabled: false, reminderTimes: [] }] });
        setFormFile(null);
        setFormErrors({});
    };

    const handleOpenModal = (type: ModalType, data?: Insurance) => {
        resetForm();
        if (type === 'insurance' && data) {
            setFormValues(data);
            if (data.fileData && data.fileType) {
                setFormFile({ data: data.fileData, type: data.fileType, name: t('photoOf', { item: 'card'}) });
            }
        }
        setModalState({ isOpen: true, type, data });
    };

    const validateForm = () => {
        const errors: { [key: string]: string | { [key: string]: string } } = {};
        const type = modalState.type;

        if (type === 'record') {
            if (!formValues.name) errors.name = t('fieldRequired');
            if (!formValues.date) errors.date = t('fieldRequired');
            if (!formFile) errors.file = t('fileRequired');
        } else if (type === 'prescription') {
            const drugErrors: { [key: string]: string } = {};
            if (!formValues.doctor) errors.doctor = t('fieldRequired');
            if (!formValues.date) errors.date = t('fieldRequired');

            const validDrugs = formValues.drugs.filter((d: Drug) => d.name && d.dosage);
            if(validDrugs.length === 0) {
                errors.drugs = t('prescriptionRequiresOneDrug');
            } else {
                 formValues.drugs.forEach((drug: Drug) => {
                    if (!drug.name && drug.dosage) drugErrors[`${drug.id}_name`] = t('fieldRequired');
                    if (drug.name && !drug.dosage) drugErrors[`${drug.id}_dosage`] = t('fieldRequired');
                    if (drug.reminderEnabled && (!drug.reminderTimes || drug.reminderTimes.length === 0)) {
                        drugErrors[`${drug.id}_reminder`] = t('fieldRequired');
                    }
                });
                if (Object.keys(drugErrors).length > 0) errors.drugs = drugErrors;
            }

        } else if (type === 'insurance') {
            if (!formValues.provider) errors.provider = t('fieldRequired');
            if (!formValues.policyNumber) errors.policyNumber = t('fieldRequired');
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    
    const handleSave = async () => {
        if (!validateForm()) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const id = Date.now().toString();

            switch (modalState.type) {
                case 'record': {
                    const newRecord: MedicalRecord = {
                        id,
                        name: formValues.name,
                        date: formValues.date,
                        fileData: formFile!.data,
                        fileType: formFile!.type,
                    };

                    if (user) {
                        // Save to database
                        await medicalRecordsService.addRecord({
                            user_id: user.id,
                            name: formValues.name,
                            issue_date: formValues.date,
                            record_type: 'medical_document', // Default type
                            file_data: formFile!.data,
                            file_type: formFile!.type,
                        });
                    } else {
                        // Save to localStorage for non-authenticated users
                        const updatedRecords = [...records, newRecord];
                        setRecords(updatedRecords);
                        localStorage.setItem('medicalRecords', JSON.stringify(updatedRecords));
                    }
                    
                    // Reload data to get the updated list
                    await loadData();
                    break;
                }
                case 'prescription': {
                    const newPrescription: Prescription = {
                        id,
                        doctor: formValues.doctor,
                        date: formValues.date,
                        drugs: formValues.drugs
                            .filter((d: Drug) => d.name && d.dosage)
                            .map((d: Drug) => ({...d, reminderTimes: d.reminderEnabled ? d.reminderTimes : []})),
                        fileData: formFile?.data,
                        fileType: formFile?.type,
                    };

                    if (user) {
                        // Save to database
                        const validDrugs = formValues.drugs.filter((d: Drug) => d.name && d.dosage);
                        const drugData = validDrugs.map((drug: Drug) => ({
                            drug_name: drug.name,
                            dosage: drug.dosage,
                            reminder_enabled: drug.reminderEnabled || false,
                            // We'll handle reminder times separately
                        }));

                        await prescriptionsService.addPrescription({
                            user_id: user.id,
                            prescribing_doctor: formValues.doctor,
                            issue_date: formValues.date,
                            file_data: formFile?.data || null,
                            file_type: formFile?.type || null,
                        }, drugData);
                    } else {
                        // Save to localStorage for non-authenticated users
                        const updatedPrescriptions = [...prescriptions, newPrescription];
                        setPrescriptions(updatedPrescriptions);
                        localStorage.setItem('prescriptions', JSON.stringify(updatedPrescriptions));
                    }
                    
                    // Reload data and schedule reminders
                    await loadData();
                    scheduleReminders();
                    break;
                }
                case 'insurance': {
                    const newInsurance: Insurance = {
                        id: modalState.data?.id || id,
                        provider: formValues.provider,
                        policyNumber: formValues.policyNumber,
                        contact: formValues.contact || '',
                        fileData: formFile?.data,
                        fileType: formFile?.type,
                    };

                    if (user) {
                        // Save to database
                        await insuranceService.upsertInsurance({
                            user_id: user.id,
                            provider_name: formValues.provider,
                            policy_number: formValues.policyNumber,
                            contact_info: formValues.contact || '',
                            file_data: formFile?.data || null,
                            file_type: formFile?.type || null,
                        });
                    } else {
                        // Save to localStorage for non-authenticated users
                        setInsurance(newInsurance);
                        localStorage.setItem('insurance', JSON.stringify(newInsurance));
                    }
                    
                    // Reload data to get the updated info
                    await loadData();
                    break;
                }
            }
        } catch (error) {
            console.error("Failed to save data:", error);
            setError("Failed to save data. Please try again.");
            
            // Fallback to localStorage for authenticated users if database fails
            if (user) {
                try {
                    const fallbackData = {
                        record: () => {
                            const newRecord: MedicalRecord = {
                                id: Date.now().toString(),
                                name: formValues.name,
                                date: formValues.date,
                                fileData: formFile!.data,
                                fileType: formFile!.type,
                            };
                            const updatedRecords = [...records, newRecord];
                            setRecords(updatedRecords);
                            localStorage.setItem('medicalRecords', JSON.stringify(updatedRecords));
                        },
                        prescription: () => {
                            const newPrescription: Prescription = {
                                id: Date.now().toString(),
                                doctor: formValues.doctor,
                                date: formValues.date,
                                drugs: formValues.drugs
                                    .filter((d: Drug) => d.name && d.dosage)
                                    .map((d: Drug) => ({...d, reminderTimes: d.reminderEnabled ? d.reminderTimes : []})),
                                fileData: formFile?.data,
                                fileType: formFile?.type,
                            };
                            const updatedPrescriptions = [...prescriptions, newPrescription];
                            setPrescriptions(updatedPrescriptions);
                            localStorage.setItem('prescriptions', JSON.stringify(updatedPrescriptions));
                            scheduleReminders();
                        },
                        insurance: () => {
                            const newInsurance: Insurance = {
                                id: modalState.data?.id || Date.now().toString(),
                                provider: formValues.provider,
                                policyNumber: formValues.policyNumber,
                                contact: formValues.contact || '',
                                fileData: formFile?.data,
                                fileType: formFile?.type,
                            };
                            setInsurance(newInsurance);
                            localStorage.setItem('insurance', JSON.stringify(newInsurance));
                        }
                    };
                    
                    if (modalState.type) {
                        fallbackData[modalState.type]();
                    }
                } catch (fallbackError) {
                    console.error("Fallback save also failed:", fallbackError);
                }
            }
        } finally {
            setLoading(false);
            handleCloseModal();
        }
    };

    const handleDelete = async (id: string, type: 'record' | 'prescription' | 'insurance') => {
        if (!window.confirm(t('deleteConfirmation'))) return;
        
        setLoading(true);
        setError(null);
        
        try {
            if (user) {
                // Delete from database
                if (type === 'record') {
                    await medicalRecordsService.deleteRecord(id);
                } else if (type === 'prescription') {
                    await prescriptionsService.deletePrescription(id);
                } else if (type === 'insurance') {
                    await insuranceService.deleteInsurance(user.id);
                }
                
                // Reload data to reflect changes
                await loadData();
            } else {
                // Delete from localStorage for non-authenticated users
                if (type === 'record') {
                    const updated = records.filter(r => r.id !== id);
                    setRecords(updated);
                    localStorage.setItem('medicalRecords', JSON.stringify(updated));
                } else if (type === 'prescription') {
                    const updated = prescriptions.filter(p => p.id !== id);
                    setPrescriptions(updated);
                    localStorage.setItem('prescriptions', JSON.stringify(updated));
                } else if (type === 'insurance') {
                    setInsurance(null);
                    localStorage.removeItem('insurance');
                }
            }
        } catch (error) {
            console.error(`Failed to delete ${type}:`, error);
            setError(`Failed to delete ${type}. Please try again.`);
            
            // For authenticated users, fallback to localStorage update
            if (user) {
                if (type === 'record') {
                    const updated = records.filter(r => r.id !== id);
                    setRecords(updated);
                    localStorage.setItem('medicalRecords', JSON.stringify(updated));
                } else if (type === 'prescription') {
                    const updated = prescriptions.filter(p => p.id !== id);
                    setPrescriptions(updated);
                    localStorage.setItem('prescriptions', JSON.stringify(updated));
                } else if (type === 'insurance') {
                    setInsurance(null);
                    localStorage.removeItem('insurance');
                }
            }
        } finally {
            setLoading(false);
        }
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            try {
                const file = event.target.files[0];
                const base64File = await fileToBase64(file);
                setFormFile(base64File);
                if (formErrors.file) setFormErrors({...formErrors, file: ''});
            } catch (error) {
                console.error("Error converting file to base64", error);
            }
        }
    };

    const handleTriggerFileInput = (capture: boolean) => {
        if (fileInputRef.current) {
            if (capture) {
                fileInputRef.current.setAttribute('capture', 'environment');
            } else {
                fileInputRef.current.removeAttribute('capture');
            }
            fileInputRef.current.click();
        }
    };
    
    const handleDrugChange = (id: string, field: keyof Drug, value: any) => {
        const updatedDrugs = formValues.drugs.map((drug: Drug) => {
            if (drug.id === id) {
                 const updatedDrug = { ...drug, [field]: value };
                 // If reminder is enabled but no times are set, add a default time
                if (field === 'reminderEnabled' && value === true && (!updatedDrug.reminderTimes || updatedDrug.reminderTimes.length === 0)) {
                    updatedDrug.reminderTimes = ['09:00'];
                }
                // If reminder is toggled, request permission if not granted
                if (field === 'reminderEnabled' && value === true && permissionStatus === 'default') {
                    requestPermission();
                }
                return updatedDrug;
            }
            return drug;
        });
        setFormValues({ ...formValues, drugs: updatedDrugs });
    };

    const addDrugField = () => {
        const newDrug = { id: Date.now().toString(), name: '', dosage: '', reminderEnabled: false, reminderTimes: [] };
        setFormValues({ ...formValues, drugs: [...formValues.drugs, newDrug] });
    };

    const removeDrugField = (id: string) => {
        const updatedDrugs = formValues.drugs.filter((drug: Drug) => drug.id !== id);
        setFormValues({ ...formValues, drugs: updatedDrugs });
    };
    
    const handleTimeChange = (drugId: string, timeIndex: number, newTime: string) => {
        const updatedDrugs = formValues.drugs.map((drug: Drug) => {
            if (drug.id === drugId) {
                const newTimes = [...(drug.reminderTimes || [])];
                newTimes[timeIndex] = newTime;
                return { ...drug, reminderTimes: newTimes };
            }
            return drug;
        });
        setFormValues({ ...formValues, drugs: updatedDrugs });
    };

    const addTimeField = (drugId: string) => {
        const updatedDrugs = formValues.drugs.map((drug: Drug) => {
            if (drug.id === drugId) {
                const newTimes = [...(drug.reminderTimes || []), '17:00'];
                return { ...drug, reminderTimes: newTimes };
            }
            return drug;
        });
        setFormValues({ ...formValues, drugs: updatedDrugs });
    };

    const removeTimeField = (drugId: string, timeIndex: number) => {
        const updatedDrugs = formValues.drugs.map((drug: Drug) => {
            if (drug.id === drugId) {
                const newTimes = (drug.reminderTimes || []).filter((_, index) => index !== timeIndex);
                return { ...drug, reminderTimes: newTimes };
            }
            return drug;
        });
        setFormValues({ ...formValues, drugs: updatedDrugs });
    };

    const localeDate = (dateString: string) => new Date(dateString).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const renderFormFields = () => {
        const type = modalState.type;
        return (
            <div className="space-y-4">
                {type === 'record' && <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('recordName')}</label>
                        <input type="text" value={formValues.name || ''} onChange={(e) => setFormValues({...formValues, name: e.target.value})} placeholder={t('recordNamePlaceholder')} className="mt-1 block w-full input-style" />
                        {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name as string}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('issueDate')}</label>
                        <input type="date" value={formValues.date || ''} onChange={(e) => setFormValues({...formValues, date: e.target.value})} className="mt-1 block w-full input-style" />
                        {formErrors.date && <p className="text-red-500 text-xs mt-1">{formErrors.date as string}</p>}
                    </div>
                </>}
                 {type === 'prescription' && <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('prescribingDoctor')}</label>
                        <input type="text" value={formValues.doctor || ''} onChange={(e) => setFormValues({...formValues, doctor: e.target.value})} placeholder={t('doctorPlaceholder')} className="mt-1 block w-full input-style" />
                        {formErrors.doctor && <p className="text-red-500 text-xs mt-1">{formErrors.doctor as string}</p>}
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('issueDate')}</label>
                        <input type="date" value={formValues.date || ''} onChange={(e) => setFormValues({...formValues, date: e.target.value})} className="mt-1 block w-full input-style" />
                        {formErrors.date && <p className="text-red-500 text-xs mt-1">{formErrors.date as string}</p>}
                    </div>
                    <hr className="dark:border-zinc-700"/>
                    <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">{t('medicationsList')}</h4>
                    {typeof formErrors.drugs === 'string' && <p className="text-red-500 text-xs">{formErrors.drugs}</p>}
                    {formValues.drugs.map((drug: Drug, index: number) => (
                        <div key={drug.id} className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border dark:border-zinc-700 space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="flex-1 space-y-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">{t('drugName')}</label>
                                        <input type="text" value={drug.name} onChange={(e) => handleDrugChange(drug.id, 'name', e.target.value)} placeholder={t('drugNamePlaceholder')} className="mt-1 block w-full input-style" />
                                        {(formErrors.drugs as any)?.[`${drug.id}_name`] && <p className="text-red-500 text-xs mt-1">{(formErrors.drugs as any)[`${drug.id}_name`]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">{t('dosage')}</label>
                                        <input type="text" value={drug.dosage} onChange={(e) => handleDrugChange(drug.id, 'dosage', e.target.value)} placeholder={t('dosagePlaceholder')} className="mt-1 block w-full input-style" />
                                        {(formErrors.drugs as any)?.[`${drug.id}_dosage`] && <p className="text-red-500 text-xs mt-1">{(formErrors.drugs as any)[`${drug.id}_dosage`]}</p>}
                                    </div>
                                </div>
                                {formValues.drugs.length > 1 && (
                                    <button onClick={() => removeDrugField(drug.id)} className="p-2 mt-5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400" aria-label={t('removeDrug')}>
                                        <Icon name="delete" className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                            <div className="border-t dark:border-zinc-700 pt-3 space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={drug.reminderEnabled || false} onChange={e => handleDrugChange(drug.id, 'reminderEnabled', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('enableReminder')}</span>
                                </label>
                                {drug.reminderEnabled && (
                                    <div className="pl-6 space-y-2">
                                        {permissionStatus === 'denied' && <p className="text-xs text-yellow-600 dark:text-yellow-400">{t('notificationsBlocked')}</p>}
                                        {permissionStatus === 'default' && <p className="text-xs text-gray-500 dark:text-gray-400">{t('notificationPermissionNeeded')}</p>}
                                        
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">{t('reminderTimes')}</label>
                                         {(drug.reminderTimes || []).map((time, timeIndex) => (
                                            <div key={timeIndex} className="flex items-center gap-2">
                                                <input type="time" value={time} onChange={(e) => handleTimeChange(drug.id, timeIndex, e.target.value)} className="input-style w-full" />
                                                <button onClick={() => removeTimeField(drug.id, timeIndex)} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400" aria-label={t('removeTime')}>
                                                    <Icon name="delete" className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {(formErrors.drugs as any)?.[`${drug.id}_reminder`] && <p className="text-red-500 text-xs mt-1">{(formErrors.drugs as any)[`${drug.id}_reminder`]}</p>}
                                        <button type="button" onClick={() => addTimeField(drug.id)} className="form-button-secondary text-xs py-1 px-2">
                                            <Icon name="plus" className="h-3 w-3 mr-1" />{t('addTime')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={addDrugField} className="form-button-secondary w-full">
                        <Icon name="plus" className="h-4 w-4 mr-2" /> {t('addDrug')}
                    </button>
                </>}
                 {type === 'insurance' && <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('insuranceProvider')}</label>
                        <input type="text" value={formValues.provider || ''} onChange={(e) => setFormValues({...formValues, provider: e.target.value})} placeholder={t('providerPlaceholder')} className="mt-1 block w-full input-style" />
                        {formErrors.provider && <p className="text-red-500 text-xs mt-1">{formErrors.provider as string}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('policyNumber')}</label>
                        <input type="text" value={formValues.policyNumber || ''} onChange={(e) => setFormValues({...formValues, policyNumber: e.target.value})} placeholder={t('policyNumberPlaceholder')} className="mt-1 block w-full input-style" />
                        {formErrors.policyNumber && <p className="text-red-500 text-xs mt-1">{formErrors.policyNumber as string}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('contactInfo')}</label>
                        <input type="text" value={formValues.contact || ''} onChange={(e) => setFormValues({...formValues, contact: e.target.value})} placeholder={t('contactPlaceholder')} className="mt-1 block w-full input-style" />
                    </div>
                </>}
                
                {/* File input for all types */}
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('uploadOrTakePhoto')}</label>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                         <button type="button" onClick={() => handleTriggerFileInput(false)} className="form-button-secondary">
                             <Icon name="upload" className="h-5 w-5 mr-2" /> {t('uploadFile')}
                         </button>
                         <button type="button" onClick={() => handleTriggerFileInput(true)} className="form-button-secondary">
                            <Icon name="camera" className="h-5 w-5 mr-2" /> {t('takePhoto')}
                         </button>
                    </div>
                    <input type="file" accept="image/*,application/pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    {formFile && <div className="mt-3 text-sm text-gray-600 dark:text-gray-300 flex items-center justify-between p-2 bg-gray-100 dark:bg-zinc-700 rounded-md">
                        <span className="truncate">{formFile.name}</span>
                        <button onClick={() => setFormFile(null)} className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 ml-2" aria-label="Remove file">
                            <Icon name="delete" className="h-4 w-4" />
                        </button>
                    </div>}
                    {formErrors.file && <p className="text-red-500 text-xs mt-1">{formErrors.file as string}</p>}
                </div>
            </div>
        );
    };

    const getModalTitle = () => {
        switch(modalState.type) {
            case 'record': return t('addRecord');
            case 'prescription': return t('addPrescription');
            case 'insurance': return modalState.data ? t('editInsurance') : t('addInsurance');
            default: return '';
        }
    }


    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t('walletTitle')}</h2>
                <p className="mt-2 max-w-2xl mx-auto text-sm text-gray-600 dark:text-gray-400">{t('walletDescription')}</p>
            </div>

            {/* Loading and Error Display */}
            {loading && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-blue-700 dark:text-blue-300 text-sm">
                            {user ? t('savingToDatabase') || 'Saving to database...' : t('processing') || 'Processing...'}
                        </span>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                        <Icon name="warning" className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
                        <button 
                            onClick={() => setError(null)}
                            className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                        >
                            <Icon name="x" className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .input-style {
                    display: block;
                    width: 100%;
                    border-radius: 0.375rem;
                    border-width: 1px;
                    border-color: #d1d5db; /* gray-300 */
                    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                    padding: 0.625rem;
                    background-color: #f9fafb; /* gray-50 */
                }
                .dark .input-style {
                    border-color: #3f3f46; /* zinc-700 */
                    background-color: #27272a; /* zinc-800 */
                }
                .input-style:focus {
                    border-color: #14b8a6; /* teal-500 */
                    --tw-ring-color: #14b8a6; /* teal-500 */
                    --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
                    --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
                    box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
                }
                .form-button-secondary {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0.5rem 1rem;
                    border: 1px solid #d1d5db; /* gray-300 */
                    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                    font-size: 0.875rem;
                    line-height: 1.25rem;
                    font-weight: 500;
                    border-radius: 0.375rem;
                    color: #374151; /* gray-700 */
                    background-color: white;
                    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
                    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                    transition-duration: 150ms;
                }
                 .dark .form-button-secondary {
                    border-color: #3f3f46; /* zinc-700 */
                    color: #d1d5db; /* gray-300 */
                    background-color: #27272a; /* zinc-800 */
                }
                 .form-button-secondary:hover {
                     background-color: #f9fafb; /* gray-50 */
                 }
                 .dark .form-button-secondary:hover {
                      background-color: #3f3f46; /* zinc-700 */
                 }
            `}</style>

            <Accordion title={t('medicalRecords')} icon="document" actionButton={<ActionButton onClick={() => handleOpenModal('record')}><Icon name="plus" className="h-4 w-4 mr-1"/>{t('add')}</ActionButton>}>
                <div className="space-y-4">
                    {records.length > 0 ? records.map(record => (
                        <div key={record.id} className="p-4 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-200">{record.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('issueDate')}: {localeDate(record.date)}</p>
                                <a href={record.fileData} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-600 dark:text-teal-400 hover:underline mt-1 inline-block">{t('viewDocument')}</a>
                            </div>
                            <button onClick={() => handleDelete(record.id, 'record')} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400" aria-label={t('deleteItem')}><Icon name="delete" className="h-5 w-5" /></button>
                        </div>
                    )) : <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('noRecords')}</p>}
                </div>
            </Accordion>
            
            <Accordion title={t('prescriptions')} icon="prescription" actionButton={<ActionButton onClick={() => handleOpenModal('prescription')}><Icon name="plus" className="h-4 w-4 mr-1"/>{t('add')}</ActionButton>}>
                 <div className="space-y-4">
                    {prescriptions.length > 0 ? prescriptions.map(p => (
                        <div key={p.id} className="p-4 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 flex justify-between items-start">
                            <div className="flex-1">
                                <p className="font-semibold text-gray-800 dark:text-gray-200">{t('prescribingDoctor')}: {p.doctor}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('issueDate')}: {localeDate(p.date)}</p>
                                <div className="space-y-1 border-t dark:border-zinc-700 pt-2">
                                    {p.drugs.map(drug => (
                                        <div key={drug.id} className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                {drug.reminderEnabled && <Icon name="bell" className="h-4 w-4 text-teal-500" />}
                                                <span className="text-gray-700 dark:text-gray-300">{drug.name}</span>
                                            </div>
                                            <span className="text-gray-500 dark:text-gray-400">{drug.dosage}</span>
                                        </div>
                                    ))}
                                </div>
                                {p.fileData && <a href={p.fileData} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-600 dark:text-teal-400 hover:underline mt-2 inline-block">{t('viewDocument')}</a>}
                            </div>
                             <button onClick={() => handleDelete(p.id, 'prescription')} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 ml-2 flex-shrink-0" aria-label={t('deleteItem')}><Icon name="delete" className="h-5 w-5" /></button>
                        </div>
                    )) : <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('noPrescriptions')}</p>}
                </div>
            </Accordion>

            <Accordion title={t('insuranceDetails')} icon="insurance" actionButton={<ActionButton onClick={() => handleOpenModal('insurance', insurance || undefined)}>{insurance ? t('edit') : t('add')}</ActionButton>}>
                {insurance ? (
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 flex justify-between items-start">
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{insurance.provider}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('policyNumber')}: {insurance.policyNumber}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('contactInfo')}: {insurance.contact}</p>
                            {insurance.fileData && <a href={insurance.fileData} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-600 dark:text-teal-400 hover:underline mt-2 inline-block">{t('viewDocument')}</a>}
                        </div>
                        <button onClick={() => handleDelete(insurance.id, 'insurance')} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 ml-2 flex-shrink-0" aria-label={t('deleteItem')}>
                            <Icon name="delete" className="h-5 w-5" />
                        </button>
                    </div>
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('noInsurance')}</p>
                )}
            </Accordion>
            
            {modalState.isOpen && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4" onClick={handleCloseModal}>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b dark:border-zinc-800 flex justify-between items-center flex-shrink-0">
                            <h3 className="text-lg font-semibold">{getModalTitle()}</h3>
                            <button onClick={handleCloseModal} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800" aria-label={t('cancel')}>
                                <Icon name="plus" className="h-5 w-5 transform rotate-45" />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto">
                            {renderFormFields()}
                        </div>
                        <div className="p-4 border-t dark:border-zinc-800 flex justify-end gap-3 flex-shrink-0">
                            <button onClick={handleCloseModal} className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition">{t('cancel')}</button>
                            <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-500 text-white hover:bg-teal-600 transition">{t('save')}</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default HealthWallet;