
import React, { useState } from 'react';
import { createRun } from '../lib/runService';

interface RunCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveyTemplateId: string;
  companyId: string;
  onRunCreated: (newRun: any) => void;
}

const RunCreateModal: React.FC<RunCreateModalProps> = ({ isOpen, onClose, surveyTemplateId, companyId, onRunCreated }) => {
  const [name, setName] = useState('');
  const [targetN, setTargetN] = useState('');
  const [minN, setMinN] = useState('');
  const [closeAt, setCloseAt] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name) {
      setError('Run name is required.');
      return;
    }

    try {
      const payload = {
        survey_template_id: surveyTemplateId,
        company_id: companyId,
        name,
        mode: 'public_link' as const, // For now, only public_link is supported
        target_n: targetN ? parseInt(targetN, 10) : undefined,
        min_n_for_analysis: minN ? parseInt(minN, 10) : undefined,
        close_at: closeAt ? new Date(closeAt).toISOString() : undefined,
      };

      const newRun = await createRun(payload);
      onRunCreated(newRun);
      onClose();
    } catch (err: any) {
      setError(`Failed to create run: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Create a New Run</h2>
        {error && <p className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="runName" className="block text-sm font-medium text-gray-700">Run Name</label>
            <input type="text" id="runName" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="targetN" className="block text-sm font-medium text-gray-700">Target Responses (Optional)</label>
              <input type="number" id="targetN" value={targetN} onChange={(e) => setTargetN(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
            </div>
            <div>
              <label htmlFor="minN" className="block text-sm font-medium text-gray-700">Min for Analysis (Optional)</label>
              <input type="number" id="minN" value={minN} onChange={(e) => setMinN(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
            </div>
          </div>
          <div className="mb-4">
            <label htmlFor="closeAt" className="block text-sm font-medium text-gray-700">Closes At (Optional)</label>
            <input type="datetime-local" id="closeAt" value={closeAt} onChange={(e) => setCloseAt(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
          </div>
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Create Run</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RunCreateModal;
