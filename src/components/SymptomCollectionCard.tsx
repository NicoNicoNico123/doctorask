import React from 'react';
import { useTranslation } from 'react-i18next';

interface SymptomCollectionCardProps {
    title: string;
    description?: string;
    inputType: 'text' | 'textarea' | 'select' | 'age' | 'duration';
    value: any;
    onChange: (value: any) => void;
    onNext: () => void;
    options?: { label: string; value: string }[];
    placeholder?: string;
    min?: number;
    max?: number;
}

const SymptomCollectionCard: React.FC<SymptomCollectionCardProps> = ({
    title,
    description,
    inputType,
    value,
    onChange,
    onNext,
    options,
    min,
    max,
    placeholder
}) => {
    const { t } = useTranslation();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value) {
            onNext();
        }
    };

  
    return (
        <div className="max-w-md lg:max-w-2xl mx-auto bg-white p-8 lg:p-12 rounded-xl shadow-lg transition-all duration-300">
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-gray-800">{title}</h2>
            {description && <p className="text-gray-600 mb-8 lg:text-lg">{description}</p>}

            <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
                {inputType === 'age' && (
                    <div className="py-4">
                        <div className="text-center text-4xl lg:text-5xl font-bold text-blue-600 mb-6">{value}</div>
                        <input
                            type="range"
                            min={min || 1}
                            max={max || 100}
                            value={value}
                            onChange={(e) => onChange(Number(e.target.value))}
                            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-sm text-gray-500 mt-2 font-medium">
                            <span>{min || 1}</span>
                            <span>{max || 100}+</span>
                        </div>
                    </div>
                )}

  
                {inputType === 'duration' && (
                    <div className="py-4">
                        <select
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full px-6 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-lg lg:text-xl"
                            autoFocus
                            required
                        >
                            <option value="">{t('symptomCollection.duration.placeholder')}</option>
                            <option value="less_than_hour">{t('symptomCollection.duration.lessThanHour')}</option>
                            <option value="few_hours">{t('symptomCollection.duration.fewHours')}</option>
                            <option value="one_day">{t('symptomCollection.duration.oneDay')}</option>
                            <option value="few_days">{t('symptomCollection.duration.fewDays')}</option>
                            <option value="one_week">{t('symptomCollection.duration.oneWeek')}</option>
                            <option value="few_weeks">{t('symptomCollection.duration.fewWeeks')}</option>
                            <option value="one_month">{t('symptomCollection.duration.oneMonth')}</option>
                            <option value="few_months">{t('symptomCollection.duration.fewMonths')}</option>
                            <option value="more_than_six_months">{t('symptomCollection.duration.moreThanSixMonths')}</option>
                        </select>
                    </div>
                )}

                {inputType === 'text' && (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-6 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-lg lg:text-xl"
                        autoFocus
                        required
                    />
                )}

                {inputType === 'textarea' && (
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        rows={5}
                        className="w-full px-6 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-lg lg:text-xl"
                        autoFocus
                    />
                )}

  
                {inputType === 'select' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {options?.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    // Small delay to show selection before moving next
                                    setTimeout(onNext, 200);
                                }}
                                className={`w-full text-left p-5 border-2 rounded-xl transition duration-200 font-medium text-lg ${value === opt.value
                                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md'
                                    : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                )}

                {inputType !== 'select' && (
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl hover:bg-blue-700 transition duration-200 font-bold text-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {t('symptomCollection.nextButton')}
                    </button>
                )}
            </form>
        </div>
    );
};

export default SymptomCollectionCard;