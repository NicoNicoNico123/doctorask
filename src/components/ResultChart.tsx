import React from 'react';
import { useTranslation } from 'react-i18next';

interface ResultChartProps {
    scores: {
        E: number;
        I: number;
        S: number;
        N: number;
        T: number;
        F: number;
        J: number;
        P: number;
    };
}

const ResultChart: React.FC<ResultChartProps> = ({ scores }) => {
    const { t } = useTranslation();

    const dimensions = [
        { left: 'E', right: 'I', leftLabel: t('resultChart.extraversion'), rightLabel: t('resultChart.introversion'), leftScore: scores.E, rightScore: scores.I },
        { left: 'S', right: 'N', leftLabel: t('resultChart.sensing'), rightLabel: t('resultChart.intuition'), leftScore: scores.S, rightScore: scores.N },
        { left: 'T', right: 'F', leftLabel: t('resultChart.thinking'), rightLabel: t('resultChart.feeling'), leftScore: scores.T, rightScore: scores.F },
        { left: 'J', right: 'P', leftLabel: t('resultChart.judging'), rightLabel: t('resultChart.perceiving'), leftScore: scores.J, rightScore: scores.P },
    ];

    return (
        <div className="w-full max-w-lg mx-auto mt-8 space-y-6">
            {dimensions.map((dim) => {
                const total = dim.leftScore + dim.rightScore;
                const leftPercent = total === 0 ? 50 : Math.round((dim.leftScore / total) * 100);
                const rightPercent = 100 - leftPercent;

                return (
                    <div key={dim.left + dim.right} className="relative">
                        <div className="flex justify-between text-sm font-medium text-gray-600 mb-1">
                            <span>{dim.leftLabel} ({dim.left})</span>
                            <span>{dim.rightLabel} ({dim.right})</span>
                        </div>
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
                            <div
                                className="h-full bg-indigo-500 transition-all duration-1000 ease-out"
                                style={{ width: `${leftPercent}%` }}
                            />
                            <div
                                className="h-full bg-purple-500 transition-all duration-1000 ease-out"
                                style={{ width: `${rightPercent}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{leftPercent}%</span>
                            <span>{rightPercent}%</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ResultChart;
