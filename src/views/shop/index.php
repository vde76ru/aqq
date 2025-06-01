<div class="container-fluid">
    <div class="page-header">
        <h1>Каталог товаров</h1>
    </div>

    <!-- Фильтры и поиск -->
    <div class="filters-section mb-4">
        <div class="row">
            <div class="col-md-6">
                <?php include __DIR__ . '/search_form.html'; ?>
            </div>
            <div class="col-md-3">
                <select id="sortSelect" class="form-control">
                    <option value="relevance">По релевантности</option>
                    <option value="name">По названию</option>
                    <option value="price_asc">Цена: по возрастанию</option>
                    <option value="price_desc">Цена: по убыванию</option>
                </select>
            </div>
            <div class="col-md-3">
                <select id="itemsPerPageSelect" class="form-control">
                    <option value="20">20 товаров</option>
                    <option value="50">50 товаров</option>
                    <option value="100">100 товаров</option>
                </select>
            </div>
        </div>
    </div>

    <!-- Активные фильтры -->
    <div class="applied-filters mb-3"></div>

    <!-- Таблица товаров -->
    <div class="table-responsive">
        <table class="table table-striped product-table" id="productTable">
            <thead>
                <tr>
                    <th><input type="checkbox" id="selectAll"></th>
                    <th class="sortable" data-column="external_id">Код</th>
                    <th>Изображение</th>
                    <th class="sortable" data-column="name">Название</th>
                    <th>SKU</th>
                    <th>Бренд/Серия</th>
                    <th>Статус</th>
                    <th>Мин.партия</th>
                    <th class="sortable" data-column="availability">Наличие</th>
                    <th>Доставка</th>
                    <th class="sortable" data-column="base_price">Цена</th>
                    <th>РРЦ</th>
                    <th>Корзина</th>
                </tr>
            </thead>
            <tbody>
                <!-- Товары загружаются через JS -->
            </tbody>
        </table>
    </div>

    <!-- Пагинация -->
    <div class="pagination-wrapper">
        <div class="pagination-info">
            <span id="totalProductsText">Найдено товаров: 0</span>
        </div>
        <div class="pagination-controls">
            <button class="btn btn-sm btn-secondary prev-btn">← Назад</button>
            <span>Страница <span id="currentPage">1</span> из <span id="totalPages">1</span></span>
            <button class="btn btn-sm btn-secondary next-btn">Вперед →</button>
        </div>
    </div>
</div>