// ! НОВЫЕ СТРОКИ: Инициализация VK Bridge !
// Этот код запускает обмен данными между вашим приложением и VK.
if (window.vkBridge) {
    vkBridge.send('VKWebAppInit');
}


// --- 1. Константы, Инициализация Firebase и Подключение к БД ---

// !!! 🚨 ВАША КОНФИГУРАЦИЯ FIREBASE (КЛЮЧИ) 🚨 !!!
const firebaseConfig = {
    apiKey: "AIzaSyDtQuQwe6qWuHZI8WfCmHMdoo0MA1hR0hM",
    authDomain: "crm-ano-dvizh11.firebaseapp.com",
    projectId: "crm-ano-dvizh11",
    storageBucket: "crm-ano-dvizh11.firebaseapp.com",
    messagingSenderId: "452385590391",
    appId: "1:452385590391:web:5372af6d4529576ce90a72",
    measurementId: "G-GDWKJH308X"
};

// Инициализируем Firebase
const app = firebase.initializeApp(firebaseConfig);
// Получаем ссылку на базу данных Firestore
const db = app.firestore();
// Получаем ссылку на сервис Аутентификации
const auth = app.auth(); 
// Ссылка на нашу коллекцию с расписанием
const trainingsRef = db.collection('trainings');

// Теперь старые константы
const form = document.getElementById('add-training-form');
const scheduleList = document.getElementById('schedule-list');
const adminContainer = document.getElementById('admin-panel-container');
const adminButton = document.getElementById('admin-toggle-btn');
let isAdminMode = false;


// --- 2. Логика АДМИНИСТРИРОВАНИЯ (ВХОД ЧЕРЕЗ FIREBASE AUTH) ---

adminButton.addEventListener('click', function() {
    
    if (!isAdminMode) {
        // --- Вход в режим админа (Используем Firebase Auth) ---
        const email = prompt('Введите email Администратора:');
        const password = prompt('Введите пароль Администратора:');
        
        if (!email || !password) return alert('Вход отменен.');

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Вход успешен
                isAdminMode = true;
                adminContainer.classList.remove('hidden'); 
                adminButton.textContent = 'Выйти из режима Администратора';
                alert(`Вход выполнен. Добро пожаловать, ${userCredential.user.email}!`);
            })
            .catch((error) => {
                // Вход неуспешен
                console.error("Ошибка входа:", error);
                alert('Ошибка входа. Проверьте логин/пароль.');
            });

    } else {
        // --- Выход из режима админа ---
        auth.signOut().then(() => {
            isAdminMode = false;
            adminContainer.classList.add('hidden'); 
            adminButton.textContent = 'Войти в режим Администратора';
            alert('Выход выполнен. Вы в режиме Пользователя.');
        }).catch((error) => {
            console.error("Ошибка выхода:", error);
            alert('Ошибка выхода.');
        });
    }
});


// --- 3. ЛОГИКА ДОБАВЛЕНИЯ НОВОЙ ТРЕНИРОВКИ (С FIREBASE) ---

form.addEventListener('submit', async function(event) { 
    event.preventDefault(); 
    
    // Проверка, что пользователь вошел
    if (!auth.currentUser) {
        alert('Действие доступно только авторизованному администратору.');
        return;
    }
    
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const name = document.getElementById('name').value;
    const trainer = document.getElementById('trainer').value; 
    const capacity = parseInt(document.getElementById('capacity').value, 10); 

    const newTraining = {
        date,
        time,
        name,
        trainer, 
        capacity,
        registered: [], // Массив для записей
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: auth.currentUser.uid 
    };

    try {
        await trainingsRef.add(newTraining); 
        form.reset();
        alert('Тренировка успешно добавлена в облачную базу данных!');
    } catch (e) {
        console.error("Ошибка при добавлении документа: ", e);
        alert('Ошибка при сохранении тренировки. Проверьте права доступа в консоли.');
    }
});


// --- 4. ЛОГИКА ЗАПИСИ НА ТРЕНИРОВКУ (С FIREBASE) ---

async function handleBooking(trainingId) {
    const trainingRef = trainingsRef.doc(trainingId);

    // --- Временно УПРОЩЕННЫЙ БЛОК ДЛЯ ОТЛАДКИ ---
    // Имитируем получение данных пользователя напрямую через prompt,
    // ИГНОРИРУЯ VK Bridge, так как unpkg.com, возможно, недоступен
    const fullName = prompt('Пожалуйста, введите Ваше ФИО (Имя и Фамилия):');
    if (!fullName) {
        alert('Запись отменена: ФИО не введено.');
        return; // Выходим, если пользователь отменил ввод
    }

    const vkLink = prompt('Пожалуйста, введите ссылку на Вашу страницу VK:');
    if (!vkLink) {
        alert('Запись отменена: Ссылка на VK не введена.');
        return; // Выходим, если пользователь отменил ввод
    }
    
    // Для отладки не используем vkUserId при ручном вводе
    const vkUserId = null; 
    // --- КОНЕЦ ВРЕМЕННО УПРОЩЕННОГО БЛОКА ---


    // Если данные получены, запускаем транзакцию
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

        // Проверка, записан ли уже этот пользователь (по ФИО, так как vkUserId = null при ручном вводе)
        if (training.registered && training.registered.some(r => r.fullName.toLowerCase() === fullName.trim().toLowerCase())) {
            alert('Вы уже записаны на эту тренировку!');
            return;
        }

        const newRegistration = {
            fullName: fullName.trim(),
            vkLink: vkLink.trim(),
            vkUserId: vkUserId // Останется null
        };

        const newRegistered = training.registered ? [...training.registered, newRegistration] : [newRegistration];

        transaction.update(trainingRef, { registered: newRegistered });
        alert(`Вы, ${fullName}, успешно записались на "${training.name}"!`);
    }).catch((error) => {
        console.error("Ошибка транзакции при записи: ", error);
        alert("Произошла ошибка при записи. Попробуйте снова.");
    });
}


// --- 5. ЛОГИКА УДАЛЕНИЯ И РЕДАКТИРОВАНИЯ ТРЕНИРОВКИ/ЗАПИСИ (С FIREBASE) ---

async function deleteTraining(trainingId) {
    if (!auth.currentUser) return alert('Действие доступно только администратору.');
    
    if (confirm('Вы уверены, что хотите полностью удалить эту тренировку из базы данных?')) {
        try {
            await trainingsRef.doc(trainingId).delete();
            alert('Тренировка удалена.');
        } catch (e) {
            console.error("Ошибка при удалении тренировки: ", e);
            alert('Ошибка при удалении тренировки. Проверьте права доступа.');
        }
    }
}

async function deleteRegistration(trainingId, fullName, vkUserIdToDelete) {
    if (!auth.currentUser) return alert('Действие доступно только администратору.');

    if (confirm(`Вы уверены, что хотите удалить запись человека "${fullName}"?`)) {
        const trainingRef = trainingsRef.doc(trainingId);

        try {
            const doc = await trainingRef.get();
            if (!doc.exists) return;
            
            const training = doc.data();
            
            const newRegistered = training.registered ? training.registered.filter(p => {
                if (vkUserIdToDelete) {
                    return p.vkUserId !== vkUserIdToDelete;
                }
                return p.fullName !== fullName;
            }) : [];

            await trainingRef.update({ registered: newRegistered });
            alert(`Запись ${fullName} удалена.`);
        } catch (e) {
            console.error("Ошибка при удалении записи: ", e);
            alert('Ошибка при удалении записи. Проверьте права доступа.');
        }
    }
}

async function editTraining(trainingId) {
    if (!auth.currentUser) return alert('Действие доступно только администратору.');
    
    try {
        const doc = await trainingsRef.doc(trainingId).get();
        if (!doc.exists) {
            alert('Тренировка не найдена.');
            return;
        }
        
        const training = doc.data();
        
        const newDate = prompt(`Редактирование "${training.name}". Новая дата (текущая: ${training.date}):`, training.date);
        if (newDate === null) return; 
        
        const newTime = prompt(`Новое время (текущее: ${training.time}):`, training.time);
        if (newTime === null) return;
        
        const newName = prompt(`Новое название (текущее: ${training.name}):`, training.name);
        if (newName === null) return;
        
        const newTrainer = prompt(`Новый тренер (текущий: ${training.trainer}):`, training.trainer);
        if (newTrainer === null) return;

        const newCapacityStr = prompt(`Новая вместимость (текущая: ${training.capacity}):`, training.capacity);
        if (newCapacityStr === null) return;
        const newCapacity = parseInt(newCapacityStr, 10);

        await trainingsRef.doc(trainingId).update({
            date: newDate,
            time: newTime,
            name: newName,
            trainer: newTrainer, 
            capacity: newCapacity
        });
        
        alert(`Тренировка "${newName}" успешно обновлена!`);

    } catch (e) {
        console.error("Ошибка при редактировании: ", e);
        alert('Ошибка при обновлении тренировки. Проверьте консоль.');
    }
}


// --- 6. ЛОГИКА ОТОБРАЖЕНИЯ (СЛУШАТЕЛЬ FIREBASE) ---

function renderSchedule(schedule) {
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
                    ? `<button class="delete-button delete-registration-btn" data-training-id="${trainingId}" data-full-name="${person.fullName}" data-vk-id="${person.vkUserId || ''}">Удалить</button>`
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
            
        const editTrainingBtnHtml = isAdminMode
            ? `<button class="submit-button edit-training-btn" style="width: 100%; margin-top: 10px; margin-left: 0; background-color: #ffc107; color: black;" data-id="${trainingId}">Редактировать</button>`
            : '';
            

        const cardHtml = `
            <div class="training-card">
                <h3>${training.name}</h3>
                <div class="details">
                    <p><strong>👤 Тренер:</strong> ${training.trainer}</p> 
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
                ${editTrainingBtnHtml}
            </div>
        `;

        scheduleList.innerHTML += cardHtml;
    });

    document.querySelectorAll('.book-button:not([disabled])').forEach(button => {
        button.addEventListener('click', function() {
            const trainingId = this.getAttribute('data-id'); 
            handleBooking(trainingId);
        });
    });

    if (isAdminMode) {
        document.querySelectorAll('.delete-training-btn').forEach(button => {
            button.addEventListener('click', function() {
                const trainingId = this.getAttribute('data-id'); 
                deleteTraining(trainingId);
            });
        });
        
        document.querySelectorAll('.edit-training-btn').forEach(button => {
            button.addEventListener('click', function() {
                const trainingId = this.getAttribute('data-id'); 
                editTraining(trainingId);
            });
        });

        document.querySelectorAll('.delete-registration-btn').forEach(button => {
            button.addEventListener('click', function() {
                const trainingId = this.getAttribute('data-training-id');
                const fullName = this.getAttribute('data-full-name');
                const vkUserIdToDelete = this.getAttribute('data-vk-id');
                
                deleteRegistration(trainingId, fullName, vkUserIdToDelete);
            });
        });
    }
}


// --- 7. ЗАПУСК ПРИЛОЖЕНИЯ: СЛУШАТЕЛЬ FIREBASE И НАСТРОЙКА VK ---

function initializeApp() {
    if (adminContainer) {
        adminContainer.classList.add('hidden'); 
    }
    
    auth.onAuthStateChanged(user => {
        if (user) {
            isAdminMode = true;
            adminContainer.classList.remove('hidden');
            adminButton.textContent = 'Выйти из режима Администратора';
        } else {
            isAdminMode = false;
            adminContainer.classList.add('hidden'); 
            adminButton.textContent = 'Войти в режим Администратора';
        }
    });

    if (window.vkBridge) {
        vkBridge.send('VKWebAppSetViewSettings', {
            'status_bar_style': 'light',
            'action_bar_color': 'none',
            'navigation_bar_color': 'none',
        }).catch(e => console.log('Не удалось установить настройки VK.', e));
    }

    trainingsRef.onSnapshot((querySnapshot) => {
        const schedule = [];
        querySnapshot.forEach((doc) => {
            schedule.push({ id: doc.id, ...doc.data() });
        });
        renderSchedule(schedule); 
    }, (error) => {
        console.error("Ошибка при получении данных из Firestore: ", error);
        scheduleList.innerHTML = '<p style="text-align: center; color: red;">Ошибка загрузки расписания. Проверьте консоль.</p>';
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);
