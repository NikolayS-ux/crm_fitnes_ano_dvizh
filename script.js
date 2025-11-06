// --- 1. Константы, Инициализация Firebase и Подключение к БД ---

// !!! 🚨 ВАША КОНФИГУРАЦИЯ FIREBASE 🚨 !!!
const firebaseConfig = {
    apiKey: "AIzaSyDtQuQwe6qWuHZI8WfCmHMdoo0MA1hR0hM",
    authDomain: "crm-ano-dvizh11.firebaseapp.com",
    projectId: "crm-ano-dvizh11",
    storageBucket: "crm-ano-dvizh11.firebasestorage.app",
    messagingSenderId: "452385590391",
    appId: "1:452385590391:web:5372af6d4529576ce90a72",
    measurementId: "G-GDWKJH308X"
};

// Инициализируем Firebase
const app = firebase.initializeApp(firebaseConfig);
// Получаем ссылку на базу данных Firestore
const db = app.firestore();
// Ссылка на нашу коллекцию с расписанием
const trainingsRef = db.collection('trainings');

// Теперь старые константы
const form = document.getElementById('add-training-form');
const scheduleList = document.getElementById('schedule-list');
const adminContainer = document.getElementById('admin-panel-container');
const adminButton = document.getElementById('admin-toggle-btn');
let isAdminMode = false;


// --- 2. Логика АДМИНИСТРИРОВАНИЯ ---

// Функция для переключения режима
adminButton.addEventListener('click', function() {
    const password = 'admin'; // АДМИН-ПАРОЛЬ
    
    if (!isAdminMode) {
        const enteredPassword = prompt('Введите пароль администратора:');
        if (enteredPassword === password) {
            isAdminMode = true;
            adminContainer.classList.remove('hidden'); 
            adminButton.textContent = 'Выйти из режима Администратора';
            alert('Вход выполнен. Вы в режиме Администратора.');
        } else if (enteredPassword !== null) {
            alert('Неверный пароль.');
        }
    } else {
        isAdminMode = false;
        adminContainer.classList.add('hidden'); 
        adminButton.textContent = 'Войти в режим Администратора';
        alert('Выход выполнен. Вы в режиме Пользователя.');
    }
});


// --- 3. ЛОГИКА ДОБАВЛЕНИЯ НОВОЙ ТРЕНИРОВКИ (С FIREBASE) ---

form.addEventListener('submit', async function(event) { 
    event.preventDefault(); 
    
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const name = document.getElementById('name').value;
    const capacity = parseInt(document.getElementById('capacity').value, 10); 

    const newTraining = {
        date,
        time,
        name,
        capacity,
        registered: [], // Массив для записей
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await trainingsRef.add(newTraining); 
        form.reset();
        alert('Тренировка успешно добавлена в облачную базу данных!');
    } catch (e) {
        console.error("Ошибка при добавлении документа: ", e);
        alert('Ошибка при сохранении тренировки.');
    }
});


// --- 4. ЛОГИКА ЗАПИСИ НА ТРЕНИРОВКУ (С FIREBASE) ---

async function handleBooking(trainingId) {
    const trainingRef = trainingsRef.doc(trainingId);
    
    // Используем транзакцию для безопасного изменения данных
    return db.runTransaction(async (transaction) => {
        const doc = await transaction.get(trainingRef);
        
        if (!doc.exists) {
            throw "Документ не существует!";
        }

        const training = doc.data();
        const currentRegistered = training.registered ? training.registered.length : 0;
        
        if (currentRegistered >= training.capacity) {
            alert('Извините, все места уже заняты.');
            return;
        }

        const fullName = prompt('Пожалуйста, введите Ваше ФИО (Имя и Фамилия):');
        if (!fullName) return; 
        const vkLink = prompt('Пожалуйста, введите ссылку на Вашу страницу VK:');
        if (!vkLink) return; 
        
        if (training.registered && training.registered.some(r => r.fullName.toLowerCase() === fullName.trim().toLowerCase())) {
            alert('Вы уже записаны на эту тренировку!');
            return;
        }

        const newRegistration = {
            fullName: fullName.trim(),
            vkLink: vkLink.trim(),
        };

        const newRegistered = training.registered ? [...training.registered, newRegistration] : [newRegistration];
        
        transaction.update(trainingRef, { registered: newRegistered });
        alert(`Вы, ${fullName}, успешно записались на "${training.name}"!`);
    }).catch((error) => {
        console.error("Ошибка транзакции при записи: ", error);
        alert("Произошла ошибка при записи. Попробуйте снова.");
    });
}


// --- 5. ЛОГИКА УДАЛЕНИЯ ТРЕНИРОВКИ/ЗАПИСИ (С FIREBASE) ---

async function deleteTraining(trainingId) {
    if (confirm('Вы уверены, что хотите полностью удалить эту тренировку из базы данных?')) {
        try {
            await trainingsRef.doc(trainingId).delete();
            alert('Тренировка удалена.');
        } catch (e) {
            console.error("Ошибка при удалении тренировки: ", e);
            alert('Ошибка при удалении тренировки.');
        }
    }
}

async function deleteRegistration(trainingId, fullName) {
    if (confirm(`Вы уверены, что хотите удалить запись человека "${fullName}"?`)) {
        const trainingRef = trainingsRef.doc(trainingId);

        try {
            const doc = await trainingRef.get();
            if (!doc.exists) return;
            
            const training = doc.data();
            
            const newRegistered = training.registered ? training.registered.filter(p => p.fullName !== fullName) : [];

            await trainingRef.update({ registered: newRegistered });
            alert(`Запись ${fullName} удалена.`);
        } catch (e) {
            console.error("Ошибка при удалении записи: ", e);
            alert('Ошибка при удалении записи.');
        }
    }
}


// --- 6. ЛОГИКА ОТОБРАЖЕНИЯ (СЛУШАТЕЛЬ FIREBASE) ---

function renderSchedule(schedule) {
    
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
        const trainingId = training.id; 
        
        const currentRegistered = training.registered ? training.registered.length : 0;
        const isFull = currentRegistered >= training.capacity;
        const availableSlots = training.capacity - currentRegistered;
        
        const statusClass = isFull ? 'status-full' : 'status-available';
        const statusText = isFull ? 'МЕСТ НЕТ' : `Свободно: ${availableSlots}`;

        let registeredListHtml = '';
        if (currentRegistered > 0) {
            registeredListHtml = '<h4>Записались:</h4><ul>';
            training.registered.forEach(person => {
                const deleteBtnHtml = isAdminMode 
                    ? `<button class="delete-button delete-registration-btn" data-training-id="${trainingId}" data-full-name="${person.fullName}">Удалить</button>`
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

        const deleteTrainingBtnHtml = isAdminMode 
            ? `<button class="delete-button delete-training-btn" style="width: 100%; margin-top: 10px;" data-id="${trainingId}">Удалить Тренировку</button>`
            : '';

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
                    data-id="${trainingId}"
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
            const trainingId = this.getAttribute('data-id'); 
            handleBooking(trainingId);
        });
    });

    // Добавляем обработчики для кнопок удаления (только для Админа)
    if (isAdminMode) {
        document.querySelectorAll('.delete-training-btn').forEach(button => {
            button.addEventListener('click', function() {
                const trainingId = this.getAttribute('data-id'); 
                deleteTraining(trainingId);
            });
        });

        document.querySelectorAll('.delete-registration-btn').forEach(button => {
            button.addEventListener('click', function() {
                const trainingId = this.getAttribute('data-training-id');
                const fullName = this.getAttribute('data-full-name');
                deleteRegistration(trainingId, fullName);
            });
        });
    }
}


// --- 7. ЗАПУСК ПРИЛОЖЕНИЯ: СЛУШАТЕЛЬ FIREBASE ---

function initializeApp() {
    // 1. Скрываем админ-панель
    if (adminContainer) {
        adminContainer.classList.add('hidden'); 
    }
    
    // 2. Устанавливаем слушатель Firebase. 
    // Он автоматически обновляет страницу при ЛЮБОМ изменении в БД.
    trainingsRef.onSnapshot((querySnapshot) => {
        const schedule = [];
        querySnapshot.forEach((doc) => {
            // Сохраняем ID документа (ключ Firebase) и все данные
            schedule.push({ id: doc.id, ...doc.data() });
        });
        renderSchedule(schedule); // Отрисовываем расписание
    }, (error) => {
        console.error("Ошибка при получении данных из Firestore: ", error);
        scheduleList.innerHTML = '<p style="text-align: center; color: red;">Ошибка загрузки расписания. Проверьте консоль.</p>';
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);
