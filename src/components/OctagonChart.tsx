import React, { useEffect, useRef, useState } from 'react';
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

const OctagonChart: React.FC<ResultChartProps> = ({ scores }) => {
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dimensions, setDimensions] = useState({ width: 400, height: 400 });

    useEffect(() => {
        const handleResize = () => {
            // Make the chart larger and more responsive
            const width = Math.min(500, window.innerWidth - 60);
            setDimensions({ width, height: width });
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, dimensions.width, dimensions.height);

        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;
        const radius = Math.min(centerX, centerY) - 60; // More space for labels

        // Calculate percentages for each dimension
        const calculatePercent = (primary: string, secondary: string) => {
            const total = scores[primary as keyof typeof scores] + scores[secondary as keyof typeof scores];
            return total === 0 ? 50 : (scores[primary as keyof typeof scores] / total) * 100;
        };

        // Define the 8 dimensions with letters and colors for MBTI pairs
        const octagonDimensions = [
            { label: 'E', value: calculatePercent('E', 'I'), angle: 0, color: '#ef4444' }, // Red - Extraversion
            { label: 'S', value: calculatePercent('S', 'N'), angle: 45, color: '#f59e0b' }, // Orange - Sensing
            { label: 'T', value: calculatePercent('T', 'F'), angle: 90, color: '#3b82f6' }, // Blue - Thinking
            { label: 'J', value: calculatePercent('J', 'P'), angle: 135, color: '#8b5cf6' }, // Purple - Judging
            { label: 'I', value: calculatePercent('I', 'E'), angle: 180, color: '#06b6d4' }, // Cyan - Introversion
            { label: 'N', value: calculatePercent('N', 'S'), angle: 225, color: '#10b981' }, // Emerald - Intuition
            { label: 'F', value: calculatePercent('F', 'T'), angle: 270, color: '#ec4899' }, // Pink - Feeling
            { label: 'P', value: calculatePercent('P', 'J'), angle: 315, color: '#f97316' }  // Amber - Perceiving
        ];

        // Draw background octagon grid with enhanced styling
        const drawOctagonGrid = (levels: number) => {
            for (let level = 1; level <= levels; level++) {
                const levelRadius = (radius / levels) * level;
                ctx.beginPath();

                // Enhanced styling based on level
                if (level === levels) {
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                    ctx.lineWidth = 2;
                } else {
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
                    ctx.lineWidth = 1;
                }

                // Add subtle gradient for outer octagon
                if (level === levels) {
                    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, levelRadius);
                    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.05)');
                    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.1)');
                    ctx.fillStyle = gradient;

                    for (let i = 0; i <= 8; i++) {
                        const angle = (Math.PI / 4) * i - Math.PI / 8;
                        const x = centerX + Math.cos(angle) * levelRadius;
                        const y = centerY + Math.sin(angle) * levelRadius;

                        if (i === 0) {
                            ctx.moveTo(x, y);
                        } else {
                            ctx.lineTo(x, y);
                        }
                    }
                    ctx.closePath();
                    ctx.fill();
                }

                // Draw octagon border
                ctx.beginPath();
                for (let i = 0; i <= 8; i++) {
                    const angle = (Math.PI / 4) * i - Math.PI / 8;
                    const x = centerX + Math.cos(angle) * levelRadius;
                    const y = centerY + Math.sin(angle) * levelRadius;

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.closePath();
                ctx.stroke();

                // Add level labels for reference
                if (level % 2 === 0) {
                    const percentage = (level / levels) * 100;
                    ctx.font = '10px sans-serif';
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${percentage}%`, centerX - radius - 25, centerY);
                }
            }
        };

        // Draw radial lines
        const drawRadialLines = () => {
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i - Math.PI / 8;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;

                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(x, y);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        };

        // Draw the enhanced data polygon with gradient connecting points in correct order
        const drawDataPolygon = () => {
            ctx.beginPath();

            // Sort dimensions by angle to ensure proper polygon drawing
            const sortedDimensions = [...octagonDimensions].sort((a, b) => a.angle - b.angle);

            sortedDimensions.forEach((dim, index) => {
                const angle = (Math.PI / 180) * dim.angle;
                const distance = radius * (dim.value / 100);
                const x = centerX + Math.cos(angle) * distance;
                const y = centerY + Math.sin(angle) * distance;

                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.closePath();

            // Create gradient for the data polygon
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
            gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.3)');
            gradient.addColorStop(1, 'rgba(139, 92, 246, 0.2)');
            ctx.fillStyle = gradient;
            ctx.fill();

            // Add border with shadow effect
            ctx.shadowColor = 'rgba(99, 102, 241, 0.3)';
            ctx.shadowBlur = 10;
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.9)';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.shadowBlur = 0;
        };

        // Draw enhanced data points with hover effects
        const drawDataPoints = () => {
            octagonDimensions.forEach((dim) => {
                const angle = (Math.PI / 180) * dim.angle;
                const distance = radius * (dim.value / 100);
                const x = centerX + Math.cos(angle) * distance;
                const y = centerY + Math.sin(angle) * distance;

                // Draw outer glow effect with dimension color
                const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 8);
                glowGradient.addColorStop(0, dim.color);
                glowGradient.addColorStop(1, 'transparent');
                ctx.fillStyle = glowGradient;
                ctx.beginPath();
                ctx.arc(x, y, 8, 0, Math.PI * 2);
                ctx.fill();

                // Draw main data point with dimension color
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fillStyle = dim.color;
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw inner highlight
                ctx.beginPath();
                ctx.arc(x - 1, y - 1, 2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.fill();
            });
        };

        // Draw enhanced labels with individual MBTI letters and colors
        const drawLabels = () => {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Sort dimensions by angle to ensure proper label positioning
            const sortedDimensions = [...octagonDimensions].sort((a, b) => a.angle - b.angle);

            sortedDimensions.forEach((dim) => {
                const angle = (Math.PI / 180) * dim.angle;
                // Position labels further out from the data points
                const labelDistance = radius + 35;
                const x = centerX + Math.cos(angle) * labelDistance;
                const y = centerY + Math.sin(angle) * labelDistance;

                // Draw background circle for better visibility
                ctx.beginPath();
                ctx.arc(x, y - 5, 18, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.fill();
                ctx.strokeStyle = dim.color;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw letter label with dimension color (bigger and bolder)
                ctx.fillStyle = dim.color;
                ctx.font = 'bold 22px sans-serif';
                ctx.fillText(dim.label, x, y - 5);

                // Draw percentage value below the letter with background
                ctx.fillStyle = '#1f2937';
                ctx.font = 'bold 12px sans-serif';

                // Add small background rectangle for percentage
                const percentText = `${Math.round(dim.value)}%`;
                const textMetrics = ctx.measureText(percentText);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillRect(
                    x - textMetrics.width / 2 - 4,
                    y + 10,
                    textMetrics.width + 8,
                    16
                );

                ctx.strokeStyle = '#e5e7eb';
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    x - textMetrics.width / 2 - 4,
                    y + 10,
                    textMetrics.width + 8,
                    16
                );

                ctx.fillStyle = '#1f2937';
                ctx.fillText(percentText, x, y + 18);
            });
        };

        // Draw all components
        drawOctagonGrid(5);
        drawRadialLines();
        drawDataPolygon();
        drawDataPoints();
        drawLabels();

        // Draw center point with animation effect
        const time = Date.now() * 0.001;
        const pulseSize = 3 + Math.sin(time * 2) * 1;

        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseSize + 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.9)';
        ctx.fill();

    }, [scores, dimensions]);

    // Calculate overall personality balance score
    const calculateBalanceScore = () => {
        const pairs = [
            { a: scores.E, b: scores.I },
            { a: scores.S, b: scores.N },
            { a: scores.T, b: scores.F },
            { a: scores.J, b: scores.P }
        ];

        const totalBalance = pairs.reduce((acc, pair) => {
            const diff = Math.abs(pair.a - pair.b);
            const balance = 100 - (diff / Math.max(pair.a + pair.b, 1)) * 100;
            return acc + balance;
        }, 0);

        return Math.round(totalBalance / 4);
    };

    const balanceScore = calculateBalanceScore();

    return (
        <div className="w-full max-w-lg mx-auto my-8">
            <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">{t('octagonChart.title')}</h3>
                <p className="text-sm text-gray-600">{t('octagonChart.subtitle')}</p>
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">
                    {t('octagonChart.balanceScore')}: {balanceScore}%
                    {balanceScore >= 70 ? ` ${t('octagonChart.wellBalanced')}` : balanceScore >= 50 ? ` ${t('octagonChart.moderate')}` : ` ${t('octagonChart.strongPreferences')}`}
                </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <canvas
                    ref={canvasRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    className="w-full h-auto"
                />
            </div>

            <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mr-2"></div>
                        <span className="text-gray-700 font-medium">{t('octagonChart.yourProfile')}</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-3 h-3 border-2 border-gray-300 rounded-full mr-2"></div>
                        <span className="text-gray-600">{t('octagonChart.reference')}</span>
                    </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                    <div className="font-medium text-gray-700 mb-1">{t('octagonChart.understandingTheOctagon')}</div>
                    <ul className="space-y-1">
                        <li>• <strong>{t('octagonChart.outerRings')}</strong></li>
                        <li>• <strong>{t('octagonChart.coloredArea')}</strong></li>
                        <li>• <strong>{t('octagonChart.balancedScore')}</strong></li>
                        <li>• <strong>{t('octagonChart.eightDimensions')}</strong></li>
                    </ul>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                    {['E-I', 'S-N', 'T-F', 'J-P'].map((pair, index) => {
                        const [left, right] = pair.split('-');
                        const leftScore = scores[left as keyof typeof scores];
                        const rightScore = scores[right as keyof typeof scores];
                        const dominant = leftScore > rightScore ? left : rightScore > leftScore ? right : 'Balanced';

                        return (
                            <div key={pair} className="px-2 py-1 bg-gray-100 rounded text-xs">
                                <span className="font-medium">{pair}:</span>
                                <span className={`ml-1 ${
                                    dominant === left ? 'text-indigo-600' :
                                    dominant === right ? 'text-purple-600' :
                                    'text-gray-600'
                                }`}>
                                    {dominant === left ? left : dominant === right ? right : '⚖️'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default OctagonChart;