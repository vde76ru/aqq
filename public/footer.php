</div> <!-- .page-container -->
</main> <!-- .main-content -->
</div> <!-- .main-wrapper -->
</div> <!-- .app-layout -->

<!-- Toast контейнер для уведомлений -->
<div class="toast-container" id="toastContainer"></div>

<!-- Основной JavaScript -->
<script>
    // // CSRF токен для всех AJAX запросов (проверяем, что не дублируется)
    if (!window.CSRF_TOKEN) {
        window.CSRF_TOKEN = <?= json_encode(\App\Core\CSRF::token(), JSON_HEX_TAG) ?>;
    }

    // Флаг для предотвращения множественных инициализаций
    if (!window.appInitialized) {
        window.appInitialized = true;

        // Функция показа уведомлений
        function showToast(message, type = 'info', duration = 3000) {
            const toastContainer = document.getElementById('toastContainer');

            const toast = document.createElement('div');
            toast.className = `toast toast-${type} show`;

            const icons = {
                success: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414L8.586 12l-1.293 1.293a1 1 0 001.414 1.414L10 13.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"></path></svg>',
                error: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"></path></svg>',
                warning: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"></path></svg>',
                info: '<svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"></path></svg>'
            };

            toast.innerHTML = `
                <div class="toast-icon">${icons[type] || icons.info}</div>
                <div class="toast-content">
                    <div class="toast-message">${message}</div>
                </div>
                <button class="toast-close" onclick="this.parentElement.remove()">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"></path>
                    </svg>
                </button>
            `;

            toastContainer.appendChild(toast);

            setTimeout(() => {
                toast.remove();
            }, duration);
        }

        // Экспортируем showToast глобально
        window.showToast = showToast;

        // ЕДИНСТВЕННАЯ функция обновления бейджа корзины
        function updateCartBadge() {
            // Добавляем проверку на повторные вызовы
            if (window.cartBadgeUpdating) {
                return;
            }
            window.cartBadgeUpdating = true;

            fetch('/cart/json')
                .then(res => res.json())
                .then(data => {
                    const cartBadge = document.getElementById('cartBadge');
                    if (cartBadge) {
                        const cart = data.cart || {};
                        const totalItems = Object.values(cart).reduce((sum, item) => sum + (item.quantity || 0), 0);

                        if (totalItems > 0) {
                            cartBadge.textContent = totalItems;
                            cartBadge.style.display = 'block';
                        } else {
                            cartBadge.style.display = 'none';
                        }
                    }
                })
                .catch(() => {
                    // Игнорируем ошибки
                })
                .finally(() => {
                    window.cartBadgeUpdating = false;
                });
        }

        // Экспортируем функцию глобально
        window.updateCartBadge = updateCartBadge;

        // Функция для добавления товара в корзину (глобальная)
        window.addToCart = function(productId, quantity = 1) {
            fetch('/cart/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    productId: productId,
                    quantity: quantity,
                    csrf_token: window.CSRF_TOKEN
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast('Товар добавлен в корзину', 'success');
                    updateCartBadge();
                } else {
                    showToast(data.message || 'Ошибка добавления', 'error');
                }
            })
            .catch(error => {
                showToast('Ошибка сервера', 'error');
            });
        };

        // Функция загрузки наличия товаров
        window.loadAvailability = function(productIds) {
            const cityId = document.getElementById('citySelect')?.value || '1';

            fetch('/api/availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    product_ids: productIds,
                    city_id: cityId
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success && data.data) {
                    Object.entries(data.data).forEach(([productId, info]) => {
                        updateProductAvailability(productId, info);
                    });
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки наличия:', error);
            });
        };

        // Обновление информации о наличии товара
        function updateProductAvailability(productId, data) {
            const row = document.querySelector(`tr[data-product-id="${productId}"]`);
            if (!row) return;

            const availCell = row.querySelector('.availability-cell');
            const deliveryCell = row.querySelector('.delivery-date-cell');

            if (availCell) {
                const qty = data.quantity || 0;
                availCell.textContent = qty > 0 ? `${qty} шт` : 'Нет в наличии';
                availCell.className = 'availability-cell ' + (qty > 10 ? 'text-success' : qty > 0 ? 'text-warning' : 'text-danger');
            }

            if (deliveryCell && data.delivery_date) {
                deliveryCell.textContent = new Date(data.delivery_date).toLocaleDateString('ru-RU');
            }
        }

        // Экспортируем функцию глобально
        window.updateProductAvailability = updateProductAvailability;

        // ЕДИНСТВЕННЫЙ обработчик DOMContentLoaded
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 App initializing...');

            // Обновляем счетчик корзины ОДИН раз при загрузке
            updateCartBadge();

            // Сайдбар функциональность
            const sidebar = document.getElementById('sidebar');
            const sidebarToggle = document.getElementById('sidebarToggle');
            const mobileMenuBtn = document.getElementById('mobileMenuBtn');

            if (sidebarToggle) {
                sidebarToggle.addEventListener('click', function() {
                    sidebar.classList.toggle('collapsed');
                    localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
                });
            }

            // Мобильное меню
            if (window.innerWidth <= 768 && mobileMenuBtn) {
                mobileMenuBtn.classList.remove('d-none');
                mobileMenuBtn.addEventListener('click', function() {
                    sidebar.classList.toggle('mobile-open');
                });
            }

            // Глобальный поиск
            const globalSearch = document.getElementById('globalSearch');
            if (globalSearch) {
                let searchTimeout;

                globalSearch.addEventListener('input', function(e) {
                    clearTimeout(searchTimeout);
                    const query = e.target.value.trim();

                    if (query.length > 2) {
                        searchTimeout = setTimeout(() => {
                            console.log('Поиск:', query);
                            // Здесь должен быть AJAX поиск к API
                            if (window.productsManager && typeof window.productsManager.search === 'function') {
                                window.productsManager.search(query);
                            }
                        }, 500);
                    }
                });
            }

            // Обработка выбора города
            const citySelect = document.getElementById('citySelect');
            if (citySelect) {
                // Восстанавливаем сохраненный город
                const savedCityId = localStorage.getItem('selected_city_id');
                if (savedCityId) {
                    citySelect.value = savedCityId;
                }

                citySelect.addEventListener('change', function(e) {
                    const cityId = e.target.value;
                    const cityName = e.target.options[e.target.selectedIndex].text;

                    localStorage.setItem('selected_city_id', cityId);
                    localStorage.setItem('selected_city_name', cityName);

                    showToast(`Город изменен на ${cityName}`, 'success');

                    // Обновляем данные о наличии товаров
                    if (typeof window.updateCityAvailability === 'function') {
                        window.updateCityAvailability(cityId);
                    }
                });
            }

            // Инициализация таблиц
            if (typeof window.initTableResize === 'function') {
                window.initTableResize();
            }

            // Анимация карточек
            const animateElements = document.querySelectorAll('.stat-card, .card, .table-wrapper');
            animateElements.forEach((el, index) => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';

                setTimeout(() => {
                    el.style.transition = 'all 0.5s ease-out';
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, index * 100);
            });

            console.log('✅ App initialized successfully');
        });
    }
</script>

<!-- Подключаем скомпилированные Vite файлы -->
<?php
// Динамическое подключение файлов после сборки
$distPath = $_SERVER['DOCUMENT_ROOT'] . '/assets/dist/assets/';

if (is_dir($distPath)) {
    // // Ищем CSS файлы
    // $cssFiles = glob($distPath . 'main-*.css');
    // foreach ($cssFiles as $cssFile) {
    //     $cssUrl = str_replace($_SERVER['DOCUMENT_ROOT'], '', $cssFile);
    //     echo '<link rel="stylesheet" href="' . htmlspecialchars($cssUrl) . '">' . PHP_EOL;
    // }

    // Ищем JS файлы
    $jsFiles = glob($distPath . 'main-*.js');
    foreach ($jsFiles as $jsFile) {
        $jsUrl = str_replace($_SERVER['DOCUMENT_ROOT'], '', $jsFile);
        echo '<script type="module" src="' . htmlspecialchars($jsUrl) . '"></script>' . PHP_EOL;
    }
} else {
    // Fallback если файлы еще не собраны
    echo '<!-- Vite assets not found. Run "npm run build" to generate them. -->' . PHP_EOL;
}
?>
</body>
</html>
