
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CreateSurvey from './CreateSurvey';

describe('CreateSurvey', () => {
  it('should save the survey correctly', async () => {
    const { container } = render(<CreateSurvey />);

    const titleInput = container.querySelector('#title');
    const descriptionInput = container.querySelector('#description');
    const addQuestionButton = screen.getByText('Добавить вопрос');

    fireEvent.change(titleInput, { target: { value: 'Test Survey' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

    fireEvent.click(addQuestionButton);

    const questionTextInput = await screen.findByPlaceholderText('Текст вопроса 1');
    fireEvent.change(questionTextInput, { target: { value: 'Test Question' } });

    const saveButton = screen.getByText('Сохранить');
    fireEvent.click(saveButton);

    // Add assertions here to check if the survey was saved correctly
  });
});
