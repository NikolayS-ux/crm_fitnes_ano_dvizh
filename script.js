// --- 1. Константы и Инициализация ---

// Ключ, под которым мы будем хранить данные в локальном хранилище браузера
const STORAGE_KEY = 'trainingSchedule';
// Получаем элементы из HTML
const form = document.getElementById('add-training-form');
const scheduleList = document.getElementById('schedule-list');

// Функция для получения расписания из локального хранилища
function getSchedule() {
    const data = localStorage.getItem(STORAGE_KEY);
    // Важно: теперь поле registered - это массив, а не число!
    // Добавим проверку на старый формат и инициализируем его как массив, если нужно.
    let schedule = data ? JSON.parse(data) : [];
    
    // Проверяем старые данные и конвертируем их, если они еще в виде числа
    schedule = schedule.map(t => {
        if (typeof t.registered === 'number') {
            t.registered = []; // Преобразуем число в пустой массив
        }
        return t;
    });

    return schedule;
}

// Функция для сохранения расписания в локальное хранилище
function saveSchedule(schedule) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
}


// --- 2. Логика добавления новой тренировки (без изменений) ---

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
        registered: [], // Теперь это массив для хранения данных о записавшихся
    };

    const schedule = getSchedule();
    schedule.push(newTraining);
    saveSchedule(schedule);

    renderSchedule();
    form.reset();
    alert('Тренировка успешно добавлена!');
});


// --- 3. ЛОГИКА ПОИМЕННОЙ ЗАПИСИ НА ТРЕНИРОВКУ ---

function handleBooking(trainingId) {
    const schedule = getSchedule();
    const trainingIndex = schedule.findIndex(t => t.id === trainingId);

    if (trainingIndex !== -1) {
        const training = schedule[trainingIndex];
        
        // Проверяем, есть ли свободные места (сравниваем длину массива с вместимостью)
        if (training.registered.length < training.capacity) {
            
            // --- Запрашиваем данные у пользователя ---
            const fullName = prompt('Пожалуйста, введите Ваше ФИО (Имя и Фамилия):');
            if (!fullName) return; // Если пользователь нажал Отмена

            const vkLink = prompt('Пожалуйста, введите ссылку на Вашу страницу VK (например, vk.com/id12345):');
            if (!vkLink) return; // Если пользователь нажал Отмена
            
            // Проверяем, не записан ли этот человек уже
            if (training.registered.some(r => r.fullName === fullName)) {
                alert('Вы уже записаны на эту тренировку!');
                return;
            }

            // Создаем объект с данными записавшегося
            const newRegistration = {
                fullName: fullName.trim(),
                vkLink: vkLink.trim(),
            };

            // Добавляем запись в массив
            training.registered.push(newRegistration); 
            saveSchedule(schedule);
            renderSchedule(); 
            alert(`Вы, ${fullName}, успешно записались на "${training.name}"!`);
        } else {
            alert('Извините, все места уже заняты.');
        }
    }
}


// --- 4. ЛОГИКА ОТОБРАЖЕНИЯ РАСПИСАНИЯ С УЧЕТОМ ЗАПИСЕЙ ---

function renderSchedule() {
    const schedule = getSchedule();
    
    // Сортируем расписание по дате и времени
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
        // Текущее количество записанных теперь равно длине массива registered
        const currentRegistered = training.registered.length;
        const isFull = currentRegistered >= training.capacity;
        const availableSlots = training.capacity - currentRegistered;
        
        const statusClass = isFull ? 'status-full' : 'status-available';
        const statusText = isFull ? 'МЕСТ НЕТ' : `Свободно: ${availableSlots}`;

        // Создаем HTML для списка записавшихся
        let registeredListHtml = '';
        if (currentRegistered > 0) {
            registeredListHtml = '<h4>Записались:</h4><ul>';
            training.registered.forEach(person => {
                // Отображаем ФИО и делаем ссылку на VK
                registeredListHtml += `
                    <li>
                        ${person.fullName} (<a href="${person.vkLink}" target="_blank">VK</a>)
                    </li>
                `;
            });
            registeredListHtml += '</ul>';
        }


        // Создаем HTML-карточку для каждой тренировки
        const cardHtml = `
            <div class="training-card">
                <h3>${training.name}</h3>
                <div class="details">
                    <p><strong>📅 Дата:</strong> ${new Date(training.date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })}</p>
                    <p><strong>⏰ Время:</strong> ${training.time}</p>
                    <p><strong>👥 Записано:</strong> ${currentRegistered} из ${training.capacity}</p>
                    ${registeredListHtml} </div>
                <div class="booking-status ${statusClass}">${statusText}</div>
                <button 
                    class="book-button" 
                    data-id="${training.id}"
                    ${isFull ? 'disabled' : ''}
                >
                    ${isFull ? 'Места закончились' : 'Записаться'}
                </button>
            </div>
        `;

        scheduleList.innerHTML += cardHtml;
    });

    // Добавляем обработчик нажатия на кнопки
    document.querySelectorAll('.book-button').forEach(button => {
        button.addEventListener('click', function() {
            const trainingId = parseInt(this.getAttribute('data-id'), 10);
            handleBooking(trainingId);
        });
    });
}

// Запускаем отображение расписания при загрузке страницы
document.addEventListener('DOMContentLoaded', renderSchedule);
