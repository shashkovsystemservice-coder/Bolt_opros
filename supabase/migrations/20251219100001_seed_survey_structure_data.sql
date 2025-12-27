
-- Insert structural parameters (axes)
INSERT INTO survey_axes (code, title, description, "order") VALUES
    ('goal', 'Цель опроса', 'Определяет основную задачу, которую решает опрос.', 1),
    ('knowledge_type', 'Тип получаемого знания', 'Определяет, какого рода информацию мы стремимся получить от респондентов.', 2),
    ('depth', 'Глубина проработки', 'Определяет уровень детализации и анализа, заложенный в структуру опроса.', 3),
    ('structure', 'Логическая структура', 'Определяет, как организована последовательность вопросов в опросе.', 4),
    ('response_format', 'Формат ответов', 'Определяет, в каком виде респонденты предоставляют свои ответы.', 5),
    ('standardization', 'Степень стандартизации', 'Определяет, насколько жёстко фиксированы вопросы и варианты ответов.', 6);

-- Insert values for each parameter

-- 1. Goal values
INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'research', 'Исследование', 1 FROM survey_axes WHERE code = 'goal';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'assessment', 'Оценка', 2 FROM survey_axes WHERE code = 'goal';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'diagnostics', 'Диагностика', 3 FROM survey_axes WHERE code = 'goal';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'control', 'Контроль', 4 FROM survey_axes WHERE code = 'goal';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'decision', 'Решение', 5 FROM survey_axes WHERE code = 'goal';

-- 2. Knowledge Type values
INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'facts', 'Факты', 1 FROM survey_axes WHERE code = 'knowledge_type';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'evaluations', 'Оценки', 2 FROM survey_axes WHERE code = 'knowledge_type';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'experience', 'Опыт', 3 FROM survey_axes WHERE code = 'knowledge_type';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'behavior', 'Поведение', 4 FROM survey_axes WHERE code = 'knowledge_type';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'reasons', 'Причины', 5 FROM survey_axes WHERE code = 'knowledge_type';

-- 3. Depth values
INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'screening', 'Скрининг', 1 FROM survey_axes WHERE code = 'depth';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'overview', 'Обзор', 2 FROM survey_axes WHERE code = 'depth';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'analytical', 'Аналитический', 3 FROM survey_axes WHERE code = 'depth';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'diagnostic', 'Диагностический', 4 FROM survey_axes WHERE code = 'depth';

-- 4. Structure values
INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'linear', 'Линейная', 1 FROM survey_axes WHERE code = 'structure';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'block', 'Блочная', 2 FROM survey_axes WHERE code = 'structure';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'branching', 'Ветвящаяся', 3 FROM survey_axes WHERE code = 'structure';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'iterative', 'Итеративная', 4 FROM survey_axes WHERE code = 'structure';

-- 5. Response Format values
INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'text', 'Текст', 1 FROM survey_axes WHERE code = 'response_format';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'number', 'Число', 2 FROM survey_axes WHERE code = 'response_format';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'scale', 'Шкала', 3 FROM survey_axes WHERE code = 'response_format';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'choice', 'Выбор', 4 FROM survey_axes WHERE code = 'response_format';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'combined', 'Комбинированный', 5 FROM survey_axes WHERE code = 'response_format';

-- 6. Standardization values
INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'free', 'Свободная', 1 FROM survey_axes WHERE code = 'standardization';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'semi-structured', 'Полуструктурированная', 2 FROM survey_axes WHERE code = 'standardization';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'standardized', 'Стандартизированная', 3 FROM survey_axes WHERE code = 'standardization';

INSERT INTO survey_axis_values (axis_id, value_code, label, "order")
SELECT id, 'methodological', 'Методическая', 4 FROM survey_axes WHERE code = 'standardization';

