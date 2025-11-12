// ! Инициализация VK Bridge !
if (window.vkBridge) {
    vkBridge.send('VKWebAppInit');
}


// --- 1. Константы, Инициализация Firebase и Подключение к БД ---

// !!! 🚨 ВАША КОНФИГУРАЦИЯ FIREBASE (КЛЮЧИ) 🚨 !!!
const firebaseConfig = {
    apiKey: "AIzaSyDtQuQwe6qWuHZI8WfCmHMdoo0MA1hR0hM",
    authDomain: "crm-ano-dvizh11.firebaseapp.com",
    projectId: "crm-ano-dvizh11",
    storageBucket: "crm-ano-dvizh11.firebasestorage.app",
    messagingSenderId: "452385590391",
    appId: "1:452385590391:web:5372af6d4529576ce90a72",
    measurementId: "G-GDWKJH308X"
};
// !!! 🚨 НЕ ЗАБУДЬТЕ ЗАМЕНИТЬ КЛЮЧИ ВЫШЕ НА СВОИ! 🚨 !!!


// Инициализируем Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = app.firestore();
const auth = app.auth(); 
const trainingsRef = db.collection('trainings');

const form = document.getElementById('add-training-form');
const scheduleList = document.getElementById('schedule-list');
const adminContainer = document.getElementById('admin-panel-container');
const adminButton = document.getElementById('admin-toggle-btn');
let isAdminMode = false;


// --- 2. Логика АДМИНИСТРИРОВАНИЯ (ВХОД ЧЕРЕЗ FIREBASE AUTH) ---

adminButton.addEventListener('click', function() {
    
    if (!isAdminMode) {
        // --- Вход в режим админа ---
        const email = prompt('Введите email Администратора:');
        const password = prompt('Введите пароль Администратора:');
        
        if (!email || !password) return alert('Вход отменен.');

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                isAdminMode = true;
                adminContainer.classList.remove('hidden'); 
                adminButton.textContent = 'Выйти из режима Администратора';
                alert(`Вход выполнен. Добро пожаловать, ${userCredential.user.email}!`);
            })
            .catch((error) => {
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


// --- 3. ЛОГИКА ДОБАВЛЕНИЯ НОВОЙ ТРЕНИРОВКИ ---

form.addEventListener('submit', async function(event) { 
    event.preventDefault(); 
    
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
        registered: [], 
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


// --- 4. ЛОГИКА ЗАПИСИ НА ТРЕНИРОВКУ (УПРОЩЕННАЯ) ---

async function handleBooking(trainingId) {
    const trainingRef = trainingsRef.doc(trainingId);
    
    let fullName = null;
    let vkLink = "Не указана"; // Значение по умолчанию
    let vkUserId = null; 

    // 1. Попытка получить данные пользователя из VK Bridge (ТОЛЬКО ЕСЛИ ВНУТРИ VK)
    if (window.vkBridge) {
        try {
            const user = await vkBridge.send('VKWebAppGetUserInfo');
            // Собираем данные
            fullName = `${user.first_name} ${user.last_name}`;
            vkLink = `https://vk.com/id${user.id}`;
            vkUserId = user.id;

        } catch (error) {
            console.warn("Ошибка VK Bridge, требуется ручной ввод ФИО:", error);
            // Ничего не делаем, переходим к ручному вводу ФИО
        }
    }

    // 2. Если ФИО не получено автоматически, запрашиваем вручную (ТОЛЬКО ФИО)
    if (!fullName) {
        fullName = prompt('Пожалуйста, введите Ваше ФИО (Имя и Фамилия):');
        if (!fullName) return; // Выходим, если пользователь отменил ввод
    }
    
    // Запрос ссылки на VK полностью убран!

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
        
        // 3. Проверка на дубликат (по ID или по ФИО)
        if (vkUserId && training.registered && training.registered.some(r => r.vkUserId === vkUserId)) {
             alert('Вы уже записаны на эту тренировку!');
             return;
        } 
        if (!vkUserId && training.registered && training.registered.some(r => r.fullName.toLowerCase() === fullName.trim().toLowerCase())) {
            alert('Вы уже записаны на эту тренировку!');
            return;
        }

        const newRegistration = {
            fullName: fullName.trim(),
            vkLink: vkLink, // Сохраняем "Не указана" или реальную ссылку
            vkUserId: vkUserId // Сохраняем ID или null
        };

        const newRegistered = training.registered ? [...training.registered, newRegistration] : [newRegistration];
        
        transaction.update(trainingRef, { registered: newRegistered });
        alert(`Вы, ${fullName}, успешно записались на "${training.name}"!`);
    }).catch((error) => {
        console.error("Ошибка транзакции при записи: ", error);
        alert("Произошла ошибка при записи. Попробуйте снова.");
    });
}


// --- 5. ЛОГИКА УДАЛЕНИЯ И РЕДАКТИРОВАНИЯ ТРЕНИРОВКИ/ЗАПИСИ ---

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
            
            // Фильтруем массив:
            const newRegistered = training.registered ? training.registered.filter(p => {
                // Если есть VK ID, удаляем по ID 
                if (vkUserIdToDelete) {
                    return p.vkUserId !== vkUserIdToDelete;
                }
                // Иначе удаляем по ФИО
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
        
        // 1. Запрашиваем новые данные через prompt
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

        // 2. Обновляем документ в Firebase
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
        if (currentRegistered > 0 && isAdminMode) { // Показываем список только админу
            registeredListHtml = '<h4>Записались (Админка):</h4><ul>';
            training.registered.forEach(person => {
                // В data-vk-id передаем ID, если он есть, для надежного удаления
                const deleteBtnHtml = isAdminMode 
                    ? `<button class="delete-button delete-registration-btn" data-training-id="${trainingId}" data-full-name="${person.fullName}" data-vk-id="${person.vkUserId || ''}">Удалить</button>`
                    : '';
                
                // Отображаем VK ссылку, только если она была получена (не "Не указана")
                const vkLinkDisplay = (person.vkLink && person.vkLink !== "Не указана") 
                    ? `(<a href="${person.vkLink}" target="_blank">VK</a>)` 
                    : '';

                registeredListHtml += `
                    <li>
                        ${person.fullName} ${vkLinkDisplay}
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
                    <p><strong>📅 Дата:</strong> ${new Date(`${training.date}T${training.time}`).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })}</p>
                    <p><strong>⏰ Время:</strong> ${training.time}</p>
                    <p><strong>👥 Места:</strong> ${currentRegistered} из ${training.capacity}</p>
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

    // Добавляем обработчики кнопок Записаться 
    document.querySelectorAll('.book-button:not([disabled])').forEach(button => {
        button.addEventListener('click', function() {
            const trainingId = this.getAttribute('data-id'); 
            handleBooking(trainingId);
        });
    });

    // Добавляем обработчики для кнопок Админа
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
    
    // 1. Слушатель, который проверяет состояние входа
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

    // 2. Устанавливаем цвет фона приложения под тему VK
    if (window.vkBridge) {
        vkBridge.send('VKWebAppSetViewSettings', {
            'status_bar_style': 'light',
            'action_bar_color': 'none',
            'navigation_bar_color': 'none',
        }).catch(e => console.log('Не удалось установить настройки VK.', e));
    }

    // 3. Устанавливаем слушатель Firebase для расписания 
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
