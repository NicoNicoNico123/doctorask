import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getPersonalityAnalysis } from '../services/openaiService';

interface PersonalityAnalysisProps {
  personalityType: string;
  scores: any;
  userContext: any;
}

interface AnalysisData {
  summary: string;
  strengths: string[];
  challenges: string[];
  careerSuggestions: string[];
  relationships: string;
  growthTips: string[];
}

const PersonalityAnalysis: React.FC<PersonalityAnalysisProps> = ({
  personalityType,
  scores,
  userContext
}) => {
  const { t } = useTranslation();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'career' | 'relationships' | 'growth'>('overview');

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);
        const analysisData = await getPersonalityAnalysis(personalityType, scores, userContext);

        // Validate and sanitize the received data
        const sanitizedData: AnalysisData = {
          summary: analysisData?.overview || t('results.analysis.overview', 'No summary available'),
          strengths: Array.isArray(analysisData?.strengths) ? analysisData.strengths : [],
          challenges: Array.isArray(analysisData?.growthAreas) ? analysisData.growthAreas : [],
          careerSuggestions: Array.isArray(analysisData?.careerSuggestions) ? analysisData.careerSuggestions : [],
          relationships: analysisData?.communicationStyle || t('results.analysis.relationships', 'No relationship data available'),
          growthTips: Array.isArray(analysisData?.developmentTips) ? analysisData.developmentTips : []
        };

        setAnalysis(sanitizedData);
      } catch (err) {
        setError(t('error.genericError') || 'Failed to generate personality analysis. Please try again.');
        console.error('Analysis error:', err);

        // Set fallback data to prevent undefined errors
        setAnalysis({
          summary: t('results.analysis.fallbackSummary', 'Analysis could not be generated'),
          strengths: [t('results.analysis.strength1', 'Self-awareness'), t('results.analysis.strength2', 'Adaptability')],
          challenges: [t('results.analysis.challenge1', 'Self-reflection'), t('results.analysis.challenge2', 'Growth mindset')],
          careerSuggestions: [t('results.analysis.career1', 'Roles matching your interests')],
          relationships: t('results.analysis.relationshipStyle', 'Your unique relationship style'),
          growthTips: [t('results.analysis.tip1', 'Continue self-discovery'), t('results.analysis.tip2', 'Develop your strengths')]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [personalityType, scores, userContext, t]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-indigo-600 mr-3"></div>
          <span className="text-gray-600">{t('loading.analyzing')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">⚠️ {error}</div>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition"
          >
            {t('error.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const tabs = [
    { id: 'overview', label: t('results.analysis.tabs.overview'), icon: '🎯' },
    { id: 'career', label: t('results.analysis.tabs.career'), icon: '💼' },
    { id: 'relationships', label: t('results.analysis.tabs.relationships'), icon: '👥' },
    { id: 'growth', label: t('results.analysis.tabs.growth'), icon: '🌱' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">{t('results.analysisTitle')}</h3>
        <p className="text-gray-600">
          {(() => {
            const key = 'results.analysisSubtitle';
            console.log('Translation key:', key, 'Personality type:', personalityType);
            console.log('Translation result:', t(key, { personalityType }));
            return t(key, { personalityType }) || t('results.subtitle');
          })()}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">{t('results.analysis.overview')}</h4>
              <p className="text-gray-600 leading-relaxed">{analysis.summary}</p>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">{t('results.analysis.strengths')}</h4>
              <ul className="space-y-2">
                {analysis.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-600">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">{t('results.analysis.growthAreas')}</h4>
              <ul className="space-y-2">
                {analysis.challenges.map((challenge, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-orange-500 mr-2">•</span>
                    <span className="text-gray-600">{challenge}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'career' && (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">{t('results.analysis.careerSuggestions')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.careerSuggestions.map((career, index) => (
                <div key={index} className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <div className="flex items-center">
                    <span className="text-indigo-600 mr-2">💼</span>
                    <span className="font-medium text-gray-800">{career}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'relationships' && (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">{t('results.analysis.relationshipStyle')}</h4>
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <p className="text-gray-700 leading-relaxed">{analysis.relationships}</p>
            </div>
          </div>
        )}

        {activeTab === 'growth' && (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">{t('results.analysis.developmentTips')}</h4>
            <div className="space-y-3">
              {analysis.growthTips.map((tip, index) => (
                <div key={index} className="flex items-start bg-green-50 p-4 rounded-lg border border-green-200">
                  <span className="text-green-600 mr-3 mt-1">🌱</span>
                  <span className="text-gray-700">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalityAnalysis;