// /var/www/www-root/data/site/vdestor.ru/src/js/utils.js

// ============================================================================
// ПЕРЕХОДНАЯ ВЕРСИЯ utils.js
// Постепенно мигрируем функции в специализированные сервисы
// ============================================================================

import { productsManager } from './ProductsManager.js';

// ===== TOAST УВЕДОМЛЕНИЯ =====
export function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'toast-error' : 'toast-success'} show`;
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    const container = document.getElementById('toastContainer') || document.body;
    container.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

// ===== ИНДИКАТОРЫ ЗАГРУЗКИ =====
export function showLoadingIndicator() {
    const existing = document.querySelector('.loading-indicator');
    if (existing) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'loading-indicator';
    indicator.innerHTML = `
        <div class="spinner-border spinner-border-sm"></div>
        <span>Загрузка...</span>
    `;
    indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 9999;
    `;
    document.body.appendChild(indicator);
}

export function hideLoadingIndicator() {
    const indicator = document.querySelector('.loading-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// ===== ЗАГРУЗКА ТОВАРОВ (ПЕРЕХОДНАЯ ВЕРСИЯ) =====
/**
 * @deprecated Используйте productsManager.fetchProducts() вместо этого
 * Эта функция оставлена для обратной совместимости
 */
export async function fetchProducts() {
    console.warn('⚠️ [DEPRECATED] utils.fetchProducts() устарел. Используйте productsManager.fetchProducts()');
    
    // Переадресуем на новый менеджер
    if (productsManager && typeof productsManager.fetchProducts === 'function') {
        return await productsManager.fetchProducts();
    }
    
    // Fallback для случаев, когда новый менеджер недоступен
    console.error('❌ ProductsManager недоступен, используем fallback');
    
    try {
        showLoadingIndicator();
        
        const params = new URLSearchParams({
            q: window.appliedFilters?.search || '',
            page: window.currentPage || 1,
            limit: window.itemsPerPage || 20,
            city_id: document.getElementById('citySelect')?.value || '1'
        });
        
        const response = await fetch(`/api/search?${params}`);
        const result = await response.json();
        
        if (result.success !== false && result.data) {
            window.productsData = result.data.products || [];
            window.totalProducts = result.data.total || 0;
            
            if (window.renderProductsTable) {
                window.renderProductsTable();
            }
        }
        
    } catch (error) {
        console.error('Fallback fetch error:', error);
        showToast('Ошибка загрузки товаров', true);
    } finally {
        hideLoadingIndicator();
    }
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
export function getCurrentCityId() {
    return document.getElementById('citySelect')?.value || '1';
}

export function formatPrice(price) {
    if (!price) return '—';
    return `${parseFloat(price).toFixed(2)} ₽`;
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== МИГРАЦИОННЫЕ ЗАМЕТКИ =====
/**
 * ПЛАН МИГРАЦИИ:
 * 
 * 1. ✅ showToast - оставляем в utils (используется везде)
 * 2. ✅ showLoadingIndicator/hideLoadingIndicator - оставляем в utils
 * 3. ⚠️ fetchProducts - помечен как deprecated, переадресует на ProductsManager
 * 4. 🔄 Постепенно заменяем вызовы utils.fetchProducts() на productsManager.fetchProducts()
 * 
 * В будущем utils.js будет содержать только общие утилиты,
 * а бизнес-логика переедет в специализированные сервисы.
 */