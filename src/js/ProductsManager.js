/**
 * Унифицированный менеджер товаров
 * Заменяет ProductManager.js и дублирующий функционал
 */

import { showToast } from './utils.js';

// ===== API Сервис =====
class ProductAPIService {
    constructor() {
        this.baseUrl = '/api';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 минут
    }

    async search(params) {
        const url = new URL(`${this.baseUrl}/search`, window.location.origin);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                url.searchParams.append(key, value);
            }
        });

        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
        
            console.log('🌐 [ProductAPIService] Response status:', response.status);
            console.log('🌐 [ProductAPIService] Response ok:', response.ok);
        
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
        
            const responseText = await response.text();
            console.log('📄 [ProductAPIService] Raw response:', responseText.substring(0, 500) + '...');
        
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ [ProductAPIService] JSON parse error:', parseError);
                console.error('❌ [ProductAPIService] Response text:', responseText);
                throw new Error('Invalid JSON response');
            }
        
            console.log('📦 [ProductAPIService] Parsed result:', result);
            return result;
        
        } catch (error) {
            console.error('💥 [ProductAPIService] Search error:', error);
            return {
                success: false,
                error: error.message,
                data: { products: [], total: 0 }
            };
        }
    }

    async getAvailability(productIds, cityId) {
        const url = new URL(`${this.baseUrl}/availability`, window.location.origin);
        url.searchParams.append('city_id', cityId);
        url.searchParams.append('product_ids', productIds.join(','));

        try {
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                return result.data || {};
            }
            return {};
        } catch (error) {
            console.error('Availability error:', error);
            return {};
        }
    }

    getCSRFToken() {
        return window.CSRF_TOKEN || '';
    }
}

// ===== Главный менеджер =====
export class ProductsManager {
    constructor() {
        this.api = new ProductAPIService();
        
        // Состояние совместимое со старым кодом
        this.products = [];
        this.currentPage = parseInt(sessionStorage.getItem('currentPage') || '1');
        this.itemsPerPage = parseInt(sessionStorage.getItem('itemsPerPage') || '20');
        this.totalProducts = 0;
        this.sortColumn = sessionStorage.getItem('sortColumn') || 'name';
        this.sortDirection = sessionStorage.getItem('sortDirection') || 'asc';
        this.appliedFilters = {};
        this.isLoading = false;

        // Восстанавливаем фильтры
        Object.keys(sessionStorage).forEach(key => {
            if (!['itemsPerPage', 'sortColumn', 'sortDirection', 'currentPage'].includes(key)) {
                this.appliedFilters[key] = sessionStorage.getItem(key);
            }
        });

        // Определяем режим
        this.isTableView = !!document.querySelector('.product-table');
        this.isShopView = !!document.querySelector('.shop-container');
        
        this.init();
    }

    init() {
        this.bindEvents();
        
        // Устанавливаем глобальные переменные для совместимости
        window.productsData = this.products;
        window.currentPage = this.currentPage;
        window.itemsPerPage = this.itemsPerPage;
        window.totalProducts = this.totalProducts;
        window.sortColumn = this.sortColumn;
        window.sortDirection = this.sortDirection;
        window.appliedFilters = this.appliedFilters;
    }

    bindEvents() {
        // Поиск
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const value = e.target.value.trim();
                
                if (value) {
                    this.appliedFilters.search = value;
                    sessionStorage.setItem('search', value);
                } else {
                    delete this.appliedFilters.search;
                    sessionStorage.removeItem('search');
                }
                
                searchTimeout = setTimeout(() => {
                    this.currentPage = 1;
                    this.fetchProducts();
                }, 300);
            });

            // Восстанавливаем значение
            if (this.appliedFilters.search) {
                searchInput.value = this.appliedFilters.search;
            }
        }
    }

    async fetchProducts() {
        console.log('🔄 [ProductsManager] Starting fetchProducts...');
        
        if (this.isLoading) {
            console.log('⏳ [ProductsManager] Already loading, skipping...');
            return;
        }
    
        this.isLoading = true;
        this.showLoadingIndicator();
    
        try {
            const params = {
                q: this.appliedFilters.search || '',
                page: this.currentPage,
                limit: this.itemsPerPage,
                sort: this.convertSortToApiFormat(this.sortColumn, this.sortDirection),
                city_id: document.getElementById('citySelect')?.value || '1'
            };
    
            // Добавляем фильтры
            Object.entries(this.appliedFilters).forEach(([key, value]) => {
                if (key !== 'search' && value) {
                    params[key] = value;
                }
            });
    
            console.log('📤 [ProductsManager] API Request params:', params);
    
            const result = await this.api.search(params);
            console.log('📦 [ProductsManager] API Response:', result);
            console.log('🔍 [ProductsManager] API Response type:', typeof result);
            console.log('✅ [ProductsManager] API Response success field:', result.success);
    
            // ИСПРАВЛЕННАЯ ПРОВЕРКА
            const isSuccessful = result.success === true || 
                               (result.data && result.data.products) ||
                               (result.products); // На случай если данные в корне
    
            console.log('🎯 [ProductsManager] Is successful:', isSuccessful);
    
            if (isSuccessful) {
                // Пробуем разные структуры ответа
                this.products = result.data?.products || result.products || [];
                this.totalProducts = result.data?.total || result.total || 0;
                
                console.log('✅ [ProductsManager] Products extracted:', this.products.length);
                console.log('📊 [ProductsManager] Total products:', this.totalProducts);
                console.log('🔍 [ProductsManager] First product sample:', this.products[0]);
                
                // Обновляем глобальные переменные
                window.productsData = this.products;
                window.totalProducts = this.totalProducts;
                
                console.log('🌍 [ProductsManager] Global variables updated');
                console.log('🌍 [ProductsManager] window.productsData length:', window.productsData.length);
                
                // Проверяем наличие функции рендеринга
                if (typeof window.renderProductsTable === 'function') {
                    console.log('🎨 [ProductsManager] Calling renderProductsTable...');
                    window.renderProductsTable();
                    console.log('✅ [ProductsManager] renderProductsTable called');
                } else {
                    console.error('❌ [ProductsManager] renderProductsTable is not a function!', typeof window.renderProductsTable);
                    
                    // Пробуем найти функцию в других местах
                    console.log('🔍 [ProductsManager] Searching for renderProductsTable...');
                    console.log('🔍 [ProductsManager] In window:', Object.keys(window).filter(k => k.includes('render')));
                }
                
                this.updatePaginationDisplay();
                
                // Загружаем наличие
                if (this.products.length > 0) {
                    this.loadAvailability();
                }
            } else {
                console.error('❌ [ProductsManager] API returned unsuccessful result');
                console.error('❌ [ProductsManager] Result structure:', Object.keys(result));
                console.error('❌ [ProductsManager] Result.success:', result.success);
                console.error('❌ [ProductsManager] Result.data:', result.data);
                console.error('❌ [ProductsManager] Result.error:', result.error);
                
                this.products = [];
                this.totalProducts = 0;
                window.productsData = [];
                window.totalProducts = 0;
                
                if (window.renderProductsTable) {
                    window.renderProductsTable();
                }
                
                showToast('Ошибка загрузки товаров: ' + (result.error || result.message || 'Неизвестная ошибка'), true);
            }
        } catch (error) {
            console.error('💥 [ProductsManager] Fetch error:', error);
            console.error('💥 [ProductsManager] Error stack:', error.stack);
            
            this.products = [];
            this.totalProducts = 0;
            window.productsData = [];
            window.totalProducts = 0;
            
            if (window.renderProductsTable) {
                window.renderProductsTable();
            }
            
            showToast('Ошибка загрузки: ' + error.message, true);
        } finally {
            this.isLoading = false;
            this.hideLoadingIndicator();
            console.log('🏁 [ProductsManager] fetchProducts completed');
        }
    }

    async loadAvailability() {
        const productIds = this.products.map(p => p.product_id);
        const cityId = document.getElementById('citySelect')?.value || '1';
        
        const availabilityData = await this.api.getAvailability(productIds, cityId);
        
        // Обновляем UI через существующую функцию
        if (window.loadAvailability) {
            window.loadAvailability(productIds);
        }
    }

    convertSortToApiFormat(column, direction) {
        if (column === 'base_price' || column === 'price') {
            return direction === 'asc' ? 'price_asc' : 'price_desc';
        }
        
        const sortableColumns = ['name', 'external_id', 'sku', 'availability', 'popularity'];
        if (sortableColumns.includes(column)) {
            return column;
        }
        
        return 'relevance';
    }

    updatePaginationDisplay() {
        const totalPages = Math.ceil(this.totalProducts / this.itemsPerPage);
        
        // Обновляем все элементы пагинации
        document.querySelectorAll('#currentPage, #currentPageBottom').forEach(el => {
            if (el) el.textContent = this.currentPage;
        });
        
        document.querySelectorAll('#totalPages, #totalPagesBottom').forEach(el => {
            if (el) el.textContent = totalPages;
        });
        
        document.querySelectorAll('#totalProductsText, #totalProductsTextBottom').forEach(el => {
            if (el) el.textContent = `Найдено товаров: ${this.totalProducts}`;
        });
        
        // Управление кнопками
        document.querySelectorAll('.prev-btn').forEach(btn => {
            if (btn) btn.disabled = this.currentPage <= 1;
        });
        
        document.querySelectorAll('.next-btn').forEach(btn => {
            if (btn) btn.disabled = this.currentPage >= totalPages;
        });
        
        // Обновляем глобальную функцию если она есть
        if (window.updatePaginationDisplay) {
            window.updatePaginationDisplay();
        }
    }

    showLoadingIndicator() {
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

    hideLoadingIndicator() {
        const indicator = document.querySelector('.loading-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // Методы для совместимости
    sortProducts(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        
        sessionStorage.setItem('sortColumn', this.sortColumn);
        sessionStorage.setItem('sortDirection', this.sortDirection);
        
        // Обновляем глобальные переменные
        window.sortColumn = this.sortColumn;
        window.sortDirection = this.sortDirection;
        
        this.currentPage = 1;
        this.fetchProducts();
    }

    loadPage(page) {
        this.currentPage = page;
        window.currentPage = page;
        sessionStorage.setItem('currentPage', page);
        this.fetchProducts();
    }
}

// Экспорт экземпляра для использования
export const productsManager = new ProductsManager();

// Делаем методы доступными глобально для совместимости
window.fetchProducts = () => productsManager.fetchProducts();
window.sortProducts = (column) => productsManager.sortProducts(column);
window.loadPage = (page) => productsManager.loadPage(page);