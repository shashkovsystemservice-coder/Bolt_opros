
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getRun, getRunStats, updateRunStatus } from '../lib/runService';
import { SurveyRun } from '../types/database';
import { toast } from 'sonner';

const RunDashboardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<SurveyRun | null>(null);
  const [stats, setStats] = useState<{ collected_n: number }>({ collected_n: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Using useCallback to prevent re-creating the function on each render,
  // which is a good practice to avoid potential loops.
  const fetchRunData = useCallback(async () => {
    if (!id) {
      setError("Run ID is not provided in the URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch run details and stats in parallel for efficiency
      const [runData, statsData] = await Promise.all([
        getRun(id),
        getRunStats(id)
      ]);
      
      if (!runData) {
          throw new Error("Run not found.");
      }

      setRun(runData as SurveyRun);
      setStats(statsData);
      setError(null); // Clear previous errors
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
      toast.error(`Failed to load run data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [id]); // The dependency array is crucial and correctly set to [id]

  useEffect(() => {
    fetchRunData();
  }, [fetchRunData]); // This will now correctly trigger only when `id` changes.

  const handleUpdateStatus = async (newStatus: 'active' | 'paused' | 'closed') => {
    if (!id) return;
    try {
        const updatedRun = await updateRunStatus(id, newStatus);
        setRun(updatedRun);
        toast.success(`Run status updated to "${newStatus}"`);
    } catch (error: any) {
        toast.error(`Failed to update status: ${error.message}`);
    }
  };

  if (loading) return <div className="text-center p-8">Loading dashboard...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  if (!run) return <div className="text-center p-8">Run not found.</div>;

  const isBelowMinN = run.min_n_for_analysis && stats.collected_n < run.min_n_for_analysis;
  const isOverdue = run.close_at && new Date(run.close_at) < new Date() && run.status === 'active';

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    closed: 'bg-red-100 text-red-800',
    draft: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="container mx-auto p-4">
      <Link to="/runs" className="text-blue-500 hover:underline">&larr; Back to all runs</Link>
      <h1 className="text-3xl font-bold my-4">{run.name}</h1>
      
      <div className="flex items-center space-x-4 mb-6">
        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusColors[run.status]}`}>
          Status: {run.status}
        </span>
        {run.status === 'active' && <button onClick={() => handleUpdateStatus('paused')} className="px-4 py-2 bg-yellow-500 text-white rounded">Pause</button>}
        {run.status === 'paused' && <button onClick={() => handleUpdateStatus('active')} className="px-4 py-2 bg-green-500 text-white rounded">Resume</button>}
        {(run.status === 'active' || run.status === 'paused') && <button onClick={() => handleUpdateStatus('closed')} className="px-4 py-2 bg-red-500 text-white rounded">Close</button>}
      </div>

      <div className="space-y-4 mb-6">
        {isBelowMinN && (
          <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
            <p><span className="font-bold">Warning:</span> Insufficient data for analysis. {stats.collected_n} of {run.min_n_for_analysis} responses collected.</p>
          </div>
        )}
        {isOverdue && (
          <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
            <p><span className="font-bold">Warning:</span> This run is overdue but still active.</p>
          </div>
        )}
      </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
           <div className="bg-white shadow rounded-lg p-4">
                <h3 className="text-gray-500 text-sm">Responses Collected</h3>
                <p className="text-3xl font-bold">{stats.collected_n}</p>
            </div>
       </div>

      {run.mode === 'public_link' && (
        <div className="bg-white shadow rounded-lg p-4">
            <h3 className="font-bold mb-2">Public Link</h3>
            {run.public_token ? (
                <input 
                    type="text" 
                    readOnly 
                    value={`${window.location.origin}/r/${run.public_token}`}
                    className="w-full p-2 border rounded bg-gray-100 cursor-copy"
                    onClick={(e) => {
                      e.currentTarget.select();
                      navigator.clipboard.writeText(e.currentTarget.value);
                      toast.success('Link copied to clipboard!');
                    }}
                />
            ) : (
                <div className="p-4 bg-gray-100 rounded-md text-center">
                    <p className="text-gray-500">Public token is not available for this run.</p>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default RunDashboardPage;
