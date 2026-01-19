
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { listRuns } from '../lib/runService';
import { SurveyRun } from '../types/database';

const RunsListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [runs, setRuns] = useState<SurveyRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = useCallback(async (companyId: string) => {
    // No need to set loading(true) here, it's handled in the useEffect
    try {
      const data = await listRuns(companyId);
      setRuns(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []); // useCallback with empty deps is correct, this function is stable.

  // <<< THE FINAL FIX >>>
  // The effect now depends on a primitive value (string), not an object.
  // This dependency is stable and will not change on every re-render.
  useEffect(() => {
    const companyId = user?.user_metadata?.company_id;

    if (companyId) {
      setLoading(true); // Set loading before fetching
      fetchRuns(companyId);
    }
    // This handles the case where the user is loaded but has no company_id.
    else if (user) {
        setLoading(false);
        setError("Company ID not found in your user profile.");
    }
    // This handles the initial state where the user object is not yet available.
    else {
        setLoading(true);
    }
  }, [user?.user_metadata?.company_id, fetchRuns]); // Dependency on the ID itself.

  if (loading) return <div>Loading runs...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Survey Runs</h1>
      <div className="bg-white shadow rounded-lg">
        <ul className="divide-y divide-gray-200">
          {runs.length > 0 ? (
            runs.map((run) => (
              <li key={run.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/runs/${run.id}`)}>
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">{run.name}</p>
                    <p className="text-sm text-gray-500">Mode: {run.mode}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800`}>
                      {run.status}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">Created: {new Date(run.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <p className="p-4 text-center text-gray-500">No runs found. You can create one to get started.</p>
          )}
        </ul>
      </div>
    </div>
  );
};

export default RunsListPage;
