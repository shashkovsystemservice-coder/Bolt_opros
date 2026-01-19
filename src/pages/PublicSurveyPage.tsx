
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getRunByPublicToken } from '../lib/runService';
import { SurveyForm } from './SurveyForm';

// A simple component for displaying centered messages
const PageMessage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="bg-white p-8 rounded-lg shadow-md text-center text-gray-700 max-w-md">
      {children}
    </div>
  </div>
);

export const PublicSurveyPage: React.FC = () => {
  const { publicToken } = useParams<{ publicToken: string }>();
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRun = async () => {
      if (!publicToken) {
          setError('No survey token provided.');
          setLoading(false);
          return;
      }
      try {
        setLoading(true);
        // Fetch the run data using the public token from the URL
        const runData = await getRunByPublicToken(publicToken);
        setRun(runData);
      } catch (err: any) {
        setError('Survey not found or an error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchRun();
  }, [publicToken]); // Effect runs when publicToken changes

  if (loading) return <PageMessage>Loading survey...</PageMessage>;
  if (error) return <PageMessage>{error}</PageMessage>;
  if (!run) return <PageMessage>Survey not found.</PageMessage>;

  // --- Status and Date Checks (as per feedback) ---
  if (run.status === 'paused') {
    return <PageMessage>This survey is temporarily paused. Please check back later.</PageMessage>;
  }

  if (run.status === 'closed' || (run.close_at && new Date(run.close_at) < new Date())) {
    return <PageMessage>This survey is now closed. Thank you for your interest.</PageMessage>;
  }

  if (run.status !== 'active') {
    return <PageMessage>This survey is not currently active.</PageMessage>;
  }

  // If all checks pass, render the survey form
  return (
    <SurveyForm 
      surveyTemplateId={run.survey_template_id} 
      runId={run.id} 
    />
  );
};
