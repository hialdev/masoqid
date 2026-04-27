import { EmployeeEditView } from 'src/views/dashboard/employee/edit/view';

export const metadata = {
   title: 'Dashboard: Edit Employee',
};

export default function EmployeeEditPage({ params }: { params: { id: string } }) {
   return <EmployeeEditView id={params.id} />;
}
