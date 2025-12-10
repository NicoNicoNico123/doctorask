import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    maxTags?: number;
    placeholder?: string;
}

const TagInput: React.FC<TagInputProps> = ({
    tags,
    onChange,
    maxTags = 5,
    placeholder
}) => {
    const { t } = useTranslation();
    const [inputValue, setInputValue] = useState('');
    const [isAtLimit, setIsAtLimit] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsAtLimit(tags.length >= maxTags);
    }, [tags, maxTags]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (!isAtLimit || value === '') {
            setInputValue(value);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
        } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
            // Remove last tag when backspacing on empty input
            removeTag(tags.length - 1);
        }
    };

    const addTag = () => {
        const trimmedInput = inputValue.trim().replace(/^#/, ''); // Remove # if user adds it
        if (trimmedInput && !tags.includes(trimmedInput) && tags.length < maxTags) {
            const newTags = [...tags, trimmedInput];
            onChange(newTags);
            setInputValue('');
            setIsAtLimit(newTags.length >= maxTags);
        }
    };

    const removeTag = (indexToRemove: number) => {
        const newTags = tags.filter((_, index) => index !== indexToRemove);
        onChange(newTags);
        setIsAtLimit(false);
    };

    const handleInputBlur = () => {
        if (inputValue.trim()) {
            addTag();
        }
    };

    return (
        <div className="space-y-4">
            {/* Tags Display */}
            <div className="flex flex-wrap gap-2 min-h-[3rem] p-3 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                {tags.length === 0 ? (
                    <p className="text-gray-500 italic w-full text-center py-2">
                        {placeholder || t('tagInput.noTagsPlaceholder', 'Add tags using Enter or comma')}
                    </p>
                ) : (
                    tags.map((tag, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium border border-indigo-200 transition-all duration-200 hover:bg-indigo-200"
                        >
                            #{tag}
                            <button
                                type="button"
                                onClick={() => removeTag(index)}
                                className="w-4 h-4 rounded-full bg-indigo-300 hover:bg-indigo-400 text-white flex items-center justify-center transition-colors duration-200 text-xs leading-none"
                                aria-label={t('tagInput.removeTag', 'Remove tag')}
                            >
                                ×
                            </button>
                        </span>
                    ))
                )}
            </div>

            {/* Input Field */}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleInputBlur}
                    placeholder={isAtLimit
                        ? t('tagInput.atLimitPlaceholder', 'Maximum tags reached')
                        : t('tagInput.inputPlaceholder', 'Type and press Enter or comma to add tag')
                    }
                    disabled={isAtLimit}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition text-lg ${
                        isAtLimit
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                />

                {/* Tag Counter */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-medium">
                    <span className={`${isAtLimit ? 'text-red-500' : 'text-gray-400'}`}>
                        {tags.length}/{maxTags}
                    </span>
                </div>
            </div>

            {/* Instructions */}
            <p className="text-sm text-gray-600">
                {t('tagInput.instructions', 'Type your interests and press Enter or comma to add them as tags. Maximum {{maxTags}} tags.', { maxTags })}
            </p>
        </div>
    );
};

export default TagInput;