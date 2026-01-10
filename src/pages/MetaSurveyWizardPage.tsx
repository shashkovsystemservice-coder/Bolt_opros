import { useNavigate } from 'react-router-dom';
import MetaSurveyWizard from '../components/MetaSurveyWizard';

export default function MetaSurveyWizardPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-12">
      <div className="container mx-auto">
        <MetaSurveyWizard
          onComplete={(id: string) => navigate(`/dashboard/surveys/${id}`)}
        />
      </div>
    </div>
  );
}
