
import { DashboardLayout } from '../components/DashboardLayout';
import { Outlet } from 'react-router-dom';

const DataPage = () => {
  return (
    <DashboardLayout>
        <Outlet />
    </DashboardLayout>
  );
};

export default DataPage;
