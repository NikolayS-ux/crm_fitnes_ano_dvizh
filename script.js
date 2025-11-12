document.addEventListener('DOMContentLoaded', () => {
    const adminToggleButton = document.getElementById('admin-toggle-btn');
    const adminSection = document.getElementById('admin-section');
    const trainingForm = document.getElementById('training-form');
    const scheduleList = document.getElementById('schedule-list');

    let isAdminMode = false;
    let trainings = JSON.parse(localStorage.getItem('trainings')) || [];

    // Функция для переключения режима администратора
    adminToggleButton.addEventListener('click', () => {
        isAdminMode = !isAdminMode;
        adminSection.classList.toggle('hidden', !isAdminMode);
        adminToggleButton.textContent = isAdminMode ? 'Выйти из режима Администратора' : 'Войти в режим Администратора';
        renderSchedule(); // Перерендеринг для показа/скрытия кнопок админа
    });

    // Функция для добавления/редактирования тренировки
    trainingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const trainingId = document.getElementById('training-id').value;
        const name = document.getElementById('training-name').value;
        const trainer = document.getElementById('training-trainer').value;
        const date = document.getElementById('training-date').value;
        const time = document.getElementById('training-time').value;
        const maxAttendees = parseInt(document.getElementById('training-max-attendees').value);

        if (!name || !trainer || !date || !time || isNaN(maxAttendees) || maxAttendees <= 0) {
            alert('Пожалуйста, заполните все поля корректно.');
            return;
        }

        const newTraining = {
            id: trainingId || Date.now().toString(), // Генерируем ID, если его нет (для новой тренировки)
            name,
            trainer,
            date,
            time,
            maxAttendees,
            attendees: []
        };

        if (trainingId) {
            // Редактирование существующей тренировки
            const index = trainings.findIndex(t => t.id === trainingId);
            if (index !== -1) {
                newTraining.attendees = trainings[index].attendees; // Сохраняем существующих посетителей
                trainings[index] = newTraining;
            }
        } else {
            // Добавление новой тренировки
            trainings.push(newTraining);
        }

        localStorage.setItem('trainings', JSON.stringify(trainings));
        trainingForm.reset();
        document.getElementById('training-id').value = ''; // Сброс ID
        renderSchedule();
    });

    // Функция для отображения расписания
    function renderSchedule() {
        scheduleList.innerHTML = '';
        trainings.forEach(training => {
            const isFull = training.attendees.length >= training.maxAttendees;
            const statusClass = isFull ? 'status-full' : 'status-available';
            const statusText = isFull ? 'Мест нет' : `Места есть (${training.attendees.length}/${training.maxAttendees})`;

            let cardHtml = `
                <div class="training-card">
                    <h3>${training.name}</h3> <p>Тренер: ${training.trainer}</p>
                    <p>Дата: ${training.date}</p>
                    <p>Время: ${training.time}</p>
                    <div class="booking-status ${statusClass}">${statusText}</div>
            `;

            if (isAdminMode) {
                cardHtml += `
                    <button class="edit-training-btn" data-id="${training.id}">Редактировать тренировку</button>
                    <button class="delete-training-btn" data-id="${training.id}">Удалить тренировку</button>
                    <h4>Записаны (${training.attendees.length}/${training.maxAttendees}):</h4>
                    <ul>
                `;
                if (training.attendees.length > 0) {
                    training.attendees.forEach(attendee => {
                        cardHtml += `
                            <li>
                                ${attendee} 
                                <button class="delete-registration-btn" data-training-id="${training.id}" data-attendee="${attendee}">Удалить</button>
                            </li>
                        `;
                    });
                } else {
                    cardHtml += `<li>Пока никто не записан.</li>`;
                }
                cardHtml += `</ul>`;
            } else {
                cardHtml += `
                    <button class="book-button" data-id="${training.id}" ${isFull ? 'disabled' : ''}>Записаться</button>
                `;
            }

            cardHtml += `</div>`;
            scheduleList.innerHTML += cardHtml;
        });

        // Добавляем слушатели событий после рендеринга
        addEventListenersToButtons();
    }

    // Добавление слушателей событий к динамически созданным кнопкам
    function addEventListenersToButtons() {
        // Очищаем существующие слушатели, чтобы избежать дублирования
        // Присваиваем null, чтобы гарантированно удалить предыдущий обработчик
        document.querySelectorAll('.book-button').forEach(button => {
            button.onclick = null; 
            button.addEventListener('click', handleBookButtonClick);
        });

        document.querySelectorAll('.edit-training-btn').forEach(button => {
            button.onclick = null;
            button.addEventListener('click', handleEditButtonClick);
        });

        document.querySelectorAll('.delete-training-btn').forEach(button => {
            button.onclick = null;
            button.addEventListener('click', handleDeleteTrainingClick);
        });

        document.querySelectorAll('.delete-registration-btn').forEach(button => {
            button.onclick = null;
            button.addEventListener('click', handleDeleteRegistrationClick);
        });
    }

    // Отдельные функции-обработчики для кнопок
    function handleBookButtonClick(e) {
        const trainingId = e.target.dataset.id;
        const defaultName = localStorage.getItem('vk_first_name') && localStorage.getItem('vk_last_name') 
            ? `${localStorage.getItem('vk_first_name')} ${localStorage.getItem('vk_last_name')}`
            : ''; 
            
        const attendeeName = prompt('Введите ваше имя для записи:', defaultName);
        
        if (attendeeName !== null && attendeeName.trim() !== '') {
            bookTraining(trainingId, attendeeName.trim());
        } else if (attendeeName !== null) {
            alert('Имя не может быть пустым. Пожалуйста, введите ваше имя.');
        }
    }

    function handleEditButtonClick(e) {
        const trainingId = e.target.dataset.id;
        editTraining(trainingId);
    }

    function handleDeleteTrainingClick(e) {
        const trainingId = e.target.dataset.id;
        if (confirm('Вы уверены, что хотите удалить эту тренировку?')) {
            deleteTraining(trainingId);
        }
    }

    function handleDeleteRegistrationClick(e) {
        const trainingId = e.target.dataset.trainingId;
        const attendeeName = e.target.dataset.attendee;
        if (confirm(`Удалить запись ${attendeeName}?`)) {
            deleteAttendee(trainingId, attendeeName);
        }
    }

    // Функция для записи на тренировку
    function bookTraining(trainingId, attendeeName) {
        const training = trainings.find(t => t.id === trainingId);
        if (training) {
            if (training.attendees.length < training.maxAttendees) {
                if (!training.attendees.includes(attendeeName)) {
                    training.attendees.push(attendeeName);
                    try {
                        localStorage.setItem('trainings', JSON.stringify(trainings));
                        renderSchedule();
                        alert('Вы успешно записаны на тренировку!');
                    } catch (e) {
                        console.error("Ошибка при сохранении в Local Storage:", e);
                        alert('Произошла ошибка при сохранении данных. Проверьте консоль разработчика.');
                    }
                } else {
                    alert('Вы уже записаны на эту тренировку.');
                }
            } else {
                alert('Мест нет.');
            }
        } else {
            alert('Не удалось найти тренировку для записи.');
        }
    }

    // Функция для редактирования тренировки
    function editTraining(trainingId) {
        const training = trainings.find(t => t.id === trainingId);
        if (training) {
            document.getElementById('training-id').value = training.id;
            document.getElementById('training-name').value = training.name;
            document.getElementById('training-trainer').value = training.trainer;
            document.getElementById('training-date').value = training.date;
            document.getElementById('training-time').value = training.time;
            document.getElementById('training-max-attendees').value = training.maxAttendees;
        }
    }

    // Функция для удаления тренировки
    function deleteTraining(trainingId) {
        trainings = trainings.filter(t => t.id !== trainingId);
        localStorage.setItem('trainings', JSON.stringify(trainings));
        renderSchedule();
    }

    // Функция для удаления посетителя из тренировки
    function deleteAttendee(trainingId, attendeeName) {
        const training = trainings.find(t => t.id === trainingId);
        if (training) {
            training.attendees = training.attendees.filter(name => name !== attendeeName);
            localStorage.setItem('trainings', JSON.stringify(trainings));
            renderSchedule();
        }
    }

    renderSchedule();
});
