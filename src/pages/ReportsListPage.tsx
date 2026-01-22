import { Link } from 'react-router-dom';

export default function ReportsListPage() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Отчеты</h1>
        <Link to="/reports/create">
          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
            Создать отчет
          </button>
        </Link>
      </div>
      <p>Раздел в разработке</p>
    </div>
  );
}
