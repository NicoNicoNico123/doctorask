import React from 'react';
import { useTranslation } from 'react-i18next';
import TagInput from './TagInput';

interface DataCollectionCardProps {
    title: string;
    description?: string;
    inputType: 'slider' | 'text' | 'select' | 'textarea' | 'tags';
    value: any;
    onChange: (value: any) => void;
    onNext: () => void;
    options?: { label: string; value: string }[];
    min?: number;
    max?: number;
    placeholder?: string;
}

const DataCollectionCard: React.FC<DataCollectionCardProps> = ({
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
        if (inputType === 'tags' ? (value && value.length > 0) : value) {
            onNext();
        }
    };

    return (
        <div className="max-w-md lg:max-w-2xl mx-auto bg-white p-8 lg:p-12 rounded-xl shadow-lg transition-all duration-300">
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-gray-800">{title}</h2>
            {description && <p className="text-gray-600 mb-8 lg:text-lg">{description}</p>}

            <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
                {inputType === 'slider' && (
                    <div className="py-4">
                        <div className="text-center text-4xl lg:text-5xl font-bold text-indigo-600 mb-6">{value}</div>
                        <input
                            type="range"
                            min={min}
                            max={max}
                            value={value}
                            onChange={(e) => onChange(Number(e.target.value))}
                            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between text-sm text-gray-500 mt-2 font-medium">
                            <span>{min}</span>
                            <span>{max}+</span>
                        </div>
                    </div>
                )}

                {inputType === 'text' && (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-6 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-lg lg:text-xl"
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
                        className="w-full px-6 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-lg lg:text-xl"
                        autoFocus
                    />
                )}

                {inputType === 'tags' && (
                    <TagInput
                        tags={value || []}
                        onChange={onChange}
                        maxTags={5}
                        placeholder={placeholder}
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
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md'
                                    : 'border-gray-200 hover:border-indigo-400 hover:bg-gray-50'
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
                        className="w-full bg-indigo-600 text-white py-4 px-6 rounded-xl hover:bg-indigo-700 transition duration-200 font-bold text-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                        disabled={inputType === 'tags' && (!value || value.length === 0)}
                    >
                        {t('dataCollection.nextButton')}
                    </button>
                )}
            </form>
        </div>
    );
};

export default DataCollectionCard;
