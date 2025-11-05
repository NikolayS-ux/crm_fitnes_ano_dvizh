// --- 1. Константы и Инициализация ---

const STORAGE_KEY = 'trainingSchedule';
const form = document.getElementById('add-training-form');
const scheduleList = document.getElementById('schedule-list');
// Элементы для Админки
const adminContainer = document.getElementById('admin-panel-container');
const adminButton = document.getElementById('admin-toggle-btn');
let isAdminMode = false; // Состояние режима

function getSchedule() {
    const data = localStorage.getItem(STORAGE_KEY);
    let schedule = data ? JSON.parse(data) : [];
    
    // Обеспечиваем, что registered - это всегда массив
    schedule = schedule.map(t => {
        if (!Array.isArray(t.registered)) {
            t.registered = []; 
        }
        return t;
    });

    return schedule;
}

function saveSchedule(schedule) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
}


// --- 2. Логика АДМИНИСТРИРОВАНИЯ ---

// Функция для переключения режима
adminButton.addEventListener('click', function() {
    const password = 'admin'; // !!! АДМИН-ПАРОЛЬ !!!
    
    if (!isAdminMode) {
        // Вход в режим админа
        const enteredPassword = prompt('Введите пароль администратора:');
        if (enteredPassword === password) {
            isAdminMode = true;
            adminContainer.classList.remove('hidden'); 
            adminButton.textContent = 'Выйти из режима Администратора';
            renderSchedule(); 
            alert('Вход выполнен. Вы в режиме Администратора.');
        } else if (enteredPassword !== null) {
            alert('Неверный пароль.');
        }
    } else {
        // Выход из режима админа
        isAdminMode = false;
        adminContainer.classList.add('hidden'); 
        adminButton.textContent = 'Войти в режим Администратора';
        renderSchedule(); 
        alert('Выход выполнен. Вы в режиме Пользователя.');
    }
});


// Функция для удаления всей тренировки
function deleteTraining(trainingId) {
    if (confirm('Вы уверены, что хотите полностью удалить эту тренировку?')) {
        let schedule = getSchedule();
        schedule = schedule.filter(t => t.id !== trainingId);
        saveSchedule(schedule);
        renderSchedule();
    }
}

// Функция для удаления конкретной записи человека
function deleteRegistration(trainingId, fullName) {
    if (confirm(`Вы уверены, что хотите удалить запись человека "${fullName}"?`)) {
        const schedule = getSchedule();
        const training = schedule.find(t => t.id === trainingId);

        if (training) {
            // Фильтруем массив записей, чтобы удалить нужного человека по ФИО
            training.registered = training.registered.filter(p => p.fullName !== fullName);
            saveSchedule(schedule);
            renderSchedule();
        }
    }
}


// --- 3. Логика добавления новой тренировки ---

form.addEventListener('submit', function(event) {
    event.preventDefault(); 
    
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const name = document.getElementById('name').value;
    const capacity = parseInt(document.getElementById('capacity').value, 10); 

    const newTraining = {
        id: Date.now(), 
        date,
        time,
        name,
        capacity,
        registered: [], // Массив для записей
    };

    const schedule = getSchedule();
    schedule.push(newTraining);
    saveSchedule(schedule);

    renderSchedule();
    form.reset();
    alert('Тренировка успешно добавлена!');
});


// --- 4. Логика поименной записи на тренировку ---

function handleBooking(trainingId) {
    const schedule = getSchedule();
    const trainingIndex = schedule.findIndex(t => t.id === trainingId);

    if (trainingIndex !== -1) {
        const training = schedule[trainingIndex];
        
        if (training.registered.length < training.capacity) {
            
            // Запрашиваем данные у пользователя
            const fullName = prompt('Пожалуйста, введите Ваше ФИО (Имя и Фамилия):');
            if (!fullName) return; 

            const vkLink = prompt('Пожалуйста, введите ссылку на Вашу страницу VK (например, vk.com/id12345):');
            if (!vkLink) return; 
            
            // Проверка на дубликат (игнорируем регистр)
            if (training.registered.some(r => r.fullName.toLowerCase() === fullName.trim().toLowerCase())) {
                alert('Вы уже записаны на эту тренировку!');
                return;
            }

            const newRegistration = {
                fullName: fullName.trim(),
                vkLink: vkLink.trim(),
            };

            training.registered.push(newRegistration); 
            saveSchedule(schedule);
            renderSchedule(); 
            alert(`Вы, ${fullName}, успешно записались на "${training.name}"!`);
        } else {
            alert('Извините, все места уже заняты.');
        }
    }
}


// --- 5. Логика отображения расписания (с кнопками удаления для Админа) ---

function renderSchedule() {
    const schedule = getSchedule();
    
    schedule.sort((a, b) => {
        const dateTimeA = new Date(`${a.date}T${a.time}`);
        const dateTimeB = new Date(`${b.date}T${b.time}`);
        return dateTimeA - dateTimeB;
    });

    scheduleList.innerHTML = ''; 

    if (schedule.length === 0) {
        scheduleList.innerHTML = '<p style="text-align: center;">Расписание пока пусто. Добавьте первую тренировку!</p>';
        return;
    }

    schedule.forEach(training => {
        const currentRegistered = training.registered.length;
        const isFull = currentRegistered >= training.capacity;
        const availableSlots = training.capacity - currentRegistered;
        
        const statusClass = isFull ? 'status-full' : 'status-available';
        const statusText = isFull ? 'МЕСТ НЕТ' : `Свободно: ${availableSlots}`;

        // Создаем HTML для списка записавшихся, добавляя кнопку удаления, если мы Админ
        let registeredListHtml = '';
        if (currentRegistered > 0) {
            registeredListHtml = '<h4>Записались:</h4><ul>';
            training.registered.forEach(person => {
                // Если мы в режиме Админа, добавляем кнопку удаления записи
                const deleteBtnHtml = isAdminMode 
                    ? `<button class="delete-button delete-registration-btn" data-training-id="${training.id}" data-full-name="${person.fullName}">Удалить</button>`
                    : '';
                registeredListHtml += `
                    <li>
                        ${person.fullName} (<a href="${person.vkLink}" target="_blank">VK</a>)
                        ${deleteBtnHtml}
                    </li>
                `;
            });
            registeredListHtml += '</ul>';
        }

        // Кнопка удаления всей тренировки (только для Админа)
        const deleteTrainingBtnHtml = isAdminMode 
            ? `<button class="delete-button delete-training-btn" style="width: 100%; margin-top: 10px;" data-id="${training.id}">Удалить Тренировку</button>`
            : '';

        // Создаем HTML-карточку
        const cardHtml = `
            <div class="training-card">
                <h3>${training.name}</h3>
                <div class="details">
                    <p><strong>📅 Дата:</strong> ${new Date(training.date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })}</p>
                    <p><strong>⏰ Время:</strong> ${training.time}</p>
                    <p><strong>👥 Записано:</strong> ${currentRegistered} из ${training.capacity}</p>
                    ${registeredListHtml} 
                </div>
                <div class="booking-status ${statusClass}">${statusText}</div>
                <button 
                    class="book-button" 
                    data-id="${training.id}"
                    ${isFull || isAdminMode ? 'disabled' : ''}
                >
                    ${isAdminMode ? 'В режиме админа нельзя записаться' : (isFull ? 'Места закончились' : 'Записаться')}
                </button>
                ${deleteTrainingBtnHtml}
            </div>
        `;

        scheduleList.innerHTML += cardHtml;
    });

    // Добавляем обработчики кнопок Записаться 
    document.querySelectorAll('.book-button:not([disabled])').forEach(button => {
        button.addEventListener('click', function() {
            const trainingId = parseInt(this.getAttribute('data-id'), 10);
            handleBooking(trainingId);
        });
    });

    // Добавляем обработчики для кнопок удаления (НОВАЯ ЛОГИКА)
    if (isAdminMode) {
        // Удаление всей тренировки
        document.querySelectorAll('.delete-training-btn').forEach(button => {
            button.addEventListener('click', function() {
                const trainingId = parseInt(this.getAttribute('data-id'), 10);
                deleteTraining(trainingId);
            });
        });

        // Удаление отдельной записи
        document.querySelectorAll('.delete-registration-btn').forEach(button => {
            button.addEventListener('click', function() {
                const trainingId = parseInt(this.getAttribute('data-training-id'), 10);
                const fullName = this.getAttribute('data-full-name');
                deleteRegistration(trainingId, fullName);
            });
        });
    }
}

// --- НОВАЯ ФУНКЦИЯ ДЛЯ ИНИЦИАЛИЗАЦИИ ---
function initializeApp() {
    // Гарантированно скрываем админ-панель после загрузки всех элементов
    if (adminContainer) {
        adminContainer.classList.add('hidden'); 
    }
    // Запускаем отображение расписания
    renderSchedule();
}

// Запускаем инициализацию при полной загрузке страницы
document.addEventListener('DOMContentLoaded', initializeApp);
