// --- 1. Константы и Инициализация ---

// Ключ, под которым мы будем хранить данные в локальном хранилище браузера
const STORAGE_KEY = 'trainingSchedule';
// Получаем элементы из HTML
const form = document.getElementById('add-training-form');
const scheduleList = document.getElementById('schedule-list');

// Функция для получения расписания из локального хранилища
function getSchedule() {
    const data = localStorage.getItem(STORAGE_KEY);
    // Если данных нет, возвращаем пустой массив, иначе парсим JSON
    return data ? JSON.parse(data) : [];
}

// Функция для сохранения расписания в локальное хранилище
function saveSchedule(schedule) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
}


// --- 2. Логика добавления новой тренировки ---

form.addEventListener('submit', function(event) {
    event.preventDefault(); // Предотвращаем стандартную отправку формы

    // Получаем значения из полей формы
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const name = document.getElementById('name').value;
    const capacity = parseInt(document.getElementById('capacity').value, 10); // Преобразуем в число

    // Создаем объект новой тренировки
    const newTraining = {
        id: Date.now(), // Уникальный ID на основе текущего времени
        date,
        time,
        name,
        capacity,
        registered: 0, // Изначально записано 0 человек
    };

    // Получаем текущее расписание, добавляем новую тренировку и сохраняем
    const schedule = getSchedule();
    schedule.push(newTraining);
    saveSchedule(schedule);

    // Обновляем отображение расписания на странице
    renderSchedule();

    // Очищаем форму
    form.reset();
    alert('Тренировка успешно добавлена!');
});


// --- 3. Логика записи на тренировку (для всех) ---

function handleBooking(trainingId) {
    const schedule = getSchedule();
    const trainingIndex = schedule.findIndex(t => t.id === trainingId);

    if (trainingIndex !== -1) {
        const training = schedule[trainingIndex];
        
        // Проверяем, есть ли свободные места
        if (training.registered < training.capacity) {
            // Увеличиваем счетчик записавшихся
            training.registered++; 
            saveSchedule(schedule);
            renderSchedule(); // Перерисовываем, чтобы обновить счетчик и кнопку
            alert(`Вы успешно записались на "${training.name}"!`);
        } else {
            alert('Извините, все места уже заняты.');
        }
    }
}


// --- 4. Логика отображения расписания (для всех) ---

function renderSchedule() {
    const schedule = getSchedule();
    
    // Сортируем расписание по дате и времени для лучшей читаемости
    schedule.sort((a, b) => {
        const dateTimeA = new Date(`${a.date}T${a.time}`);
        const dateTimeB = new Date(`${b.date}T${b.time}`);
        return dateTimeA - dateTimeB;
    });

    // Очищаем контейнер расписания
    scheduleList.innerHTML = ''; 

    if (schedule.length === 0) {
        scheduleList.innerHTML = '<p style="text-align: center;">Расписание пока пусто. Добавьте первую тренировку!</p>';
        return;
    }

    schedule.forEach(training => {
        const isFull = training.registered >= training.capacity;
        const availableSlots = training.capacity - training.registered;
        
        // Определяем класс для стилизации статуса
        const statusClass = isFull ? 'status-full' : 'status-available';
        const statusText = isFull ? 'МЕСТ НЕТ' : `Свободно: ${availableSlots}`;

        // Создаем HTML-карточку для каждой тренировки
        const cardHtml = `
            <div class="training-card">
                <h3>${training.name}</h3>
                <div class="details">
                    <p><strong>📅 Дата:</strong> ${new Date(training.date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })}</p>
                    <p><strong>⏰ Время:</strong> ${training.time}</p>
                    <p><strong>👥 Записано:</strong> ${training.registered} из ${training.capacity}</p>
                </div>
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

        // Добавляем карточку в список
        scheduleList.innerHTML += cardHtml;
    });

    // После того, как все карточки созданы, добавляем обработчик нажатия на кнопки
    document.querySelectorAll('.book-button').forEach(button => {
        button.addEventListener('click', function() {
            // Получаем ID тренировки из атрибута data-id
            const trainingId = parseInt(this.getAttribute('data-id'), 10);
            handleBooking(trainingId);
        });
    });
}

// Запускаем отображение расписания при загрузке страницы
document.addEventListener('DOMContentLoaded', renderSchedule);
