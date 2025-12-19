import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Contact } from '../types/database';
import { Button, Table, Modal, Form, Input, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      message.error(`Ошибка при загрузке контактов: ${error.message}`);
    } else {
      setContacts(data || []);
    }
    setLoading(false);
  };

  const showModal = (contact: Contact | null = null) => {
    setEditingContact(contact);
    form.setFieldsValue(
      contact || {
        first_name: '',
        last_name: '',
        company_name: '',
        email: '',
        phone: '',
      }
    );
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingContact(null);
    form.resetFields();
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        message.error('Вы не авторизованы');
        return;
      }

      let error;
      if (editingContact) {
        // Редактирование
        const { error: updateError } = await supabase
          .from('contacts')
          .update(values)
          .eq('id', editingContact.id);
        error = updateError;
      } else {
        // Создание
        const { error: insertError } = await supabase
          .from('contacts')
          .insert([{ ...values, user_id: user.id }]);
        error = insertError;
      }

      if (error) {
        message.error(`Ошибка: ${error.message}`);
      } else {
        message.success(`Контакт успешно ${editingContact ? 'обновлен' : 'создан'}!`);
        fetchContacts();
        handleCancel();
      }
    } catch (info) {
      console.log('Validate Failed:', info);
    }
  };

  const deleteContact = async (id: string) => {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) {
      message.error(`Ошибка при удалении: ${error.message}`);
    } else {
      message.success('Контакт удален');
      fetchContacts();
    }
  };

  const columns = [
    { title: 'Имя', dataIndex: 'first_name', key: 'first_name' },
    { title: 'Фамилия', dataIndex: 'last_name', key: 'last_name' },
    { title: 'Компания', dataIndex: 'company_name', key: 'company_name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Телефон', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Contact) => (
        <span>
          <Button icon={<EditOutlined />} onClick={() => showModal(record)} style={{ marginRight: 8 }} />
          <Button
            icon={<DeleteOutlined />}
            danger
            onClick={() => {
              Modal.confirm({
                title: 'Удалить контакт?',
                content: `Вы уверены, что хотите удалить ${record.first_name || ''} ${record.last_name || ''}?`,
                onOk: () => deleteContact(record.id),
              });
            }}
          />
        </span>
      ),
    },
  ];

  return (
    <div>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => showModal()}
        style={{ marginBottom: 16 }}
      >
        Добавить контакт
      </Button>
      <Table
        columns={columns}
        dataSource={contacts}
        loading={loading}
        rowKey="id"
      />
      <Modal
        title={editingContact ? 'Редактировать контакт' : 'Создать контакт'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="first_name" label="Имя">
            <Input />
          </Form.Item>
          <Form.Item name="last_name" label="Фамилия">
            <Input />
          </Form.Item>
          <Form.Item name="company_name" label="Название компании">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Телефон">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ContactsPage;
