// Función para manejar las animaciones al hacer scroll
function handleScrollAnimations() {
    // Animar elementos generales
    const elements = document.querySelectorAll('.animate-on-scroll');
    
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementBottom = element.getBoundingClientRect().bottom;
        const windowHeight = window.innerHeight;
        
        // Verificar si el elemento está fuera de la vista
        if (elementBottom < 0 || elementTop > windowHeight) {
            element.classList.remove('visible');
        }
        // Verificar si el elemento está entrando en la vista
        else if (elementTop < windowHeight * 0.8) {
            element.classList.add('visible');
        }
    });

    // Animar tarjetas de servicios con delay
    const cards = document.querySelectorAll('.servicio-card');
    cards.forEach((card, index) => {
        card.style.setProperty('--card-index', index);
        const cardTop = card.getBoundingClientRect().top;
        const cardBottom = card.getBoundingClientRect().bottom;
        const windowHeight = window.innerHeight;
        
        // Verificar si la tarjeta está fuera de la vista
        if (cardBottom < 0 || cardTop > windowHeight) {
            card.classList.remove('visible');
        }
        // Verificar si la tarjeta está entrando en la vista
        else if (cardTop < windowHeight * 0.8) {
            card.classList.add('visible');
        }
    });
}

// Función para el scroll suave
function smoothScroll(target, offset = 0) {
    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({
        top: targetPosition - offset,
        behavior: 'smooth'
    });
}

// Función para manejar la navegación
function setupNavigation() {
    const navbar = document.querySelector('.navbar');
    const navOffset = navbar.offsetHeight;

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            smoothScroll(targetSection, navOffset);
        });
    });
}

// Función para actualizar el enlace activo
function updateActiveLink() {
    const navOffset = document.querySelector('.navbar').offsetHeight;
    const sections = document.querySelectorAll('section');
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop - navOffset - 10;
        const sectionBottom = sectionTop + section.offsetHeight;
        const scroll = window.pageYOffset;
        
        if (scroll >= sectionTop && scroll < sectionBottom) {
            const targetId = '#' + section.getAttribute('id');
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.toggle('active', link.getAttribute('href') === targetId);
            });
        }
    });
}

// Función para la búsqueda
function setupSearch() {
    const searchBar = document.querySelector('.search-bar');
    let searchResults = [];
    let currentResultIndex = -1;

    // Crear el contador de resultados
    const searchCount = document.createElement('div');
    searchCount.className = 'search-count';
    searchBar.parentElement.appendChild(searchCount);

    searchBar.addEventListener('keyup', function(e) {
        if (e.key === 'Enter' && searchResults.length > 0) {
            currentResultIndex = (currentResultIndex + 1) % searchResults.length;
            highlightResult(searchResults[currentResultIndex]);
            updateSearchCount(searchResults.length, currentResultIndex + 1);
            return;
        }

        // Reiniciar búsqueda
        clearHighlights();
        searchResults = [];
        currentResultIndex = -1;

        const searchText = this.value.trim().toLowerCase();
        if (searchText.length < 2) {
            updateSearchCount(0);
            return;
        }

        // Realizar búsqueda
        searchResults = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6'))
            .filter(element => !element.closest('nav, script, .search-count'))
            .filter(element => element.textContent.toLowerCase().includes(searchText));

        searchResults.forEach(element => highlightText(element, searchText));
        updateSearchCount(searchResults.length);
    });
}

function clearHighlights() {
    document.querySelectorAll('.search-highlight, .search-highlight-active').forEach(el => {
        const parent = el.parentElement;
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
    });
}

function highlightText(element, searchText) {
    const regex = new RegExp(`(${searchText})`, 'gi');
    const newHtml = element.textContent.replace(regex, '<span class="search-highlight">$1</span>');
    element.innerHTML = newHtml;
}

function highlightResult(element) {
    clearActiveHighlight();
    const highlight = element.querySelector('.search-highlight');
    if (highlight) {
        highlight.classList.add('search-highlight-active');
        const navHeight = document.querySelector('.navbar').offsetHeight;
        smoothScroll(highlight, navHeight + 20);
    }
}

function clearActiveHighlight() {
    document.querySelectorAll('.search-highlight-active').forEach(el => {
        el.classList.remove('search-highlight-active');
    });
}

function updateSearchCount(count, current = 0) {
    const searchCount = document.querySelector('.search-count');
    if (count > 0) {
        searchCount.textContent = current > 0 
            ? `${current} de ${count} resultado${count !== 1 ? 's' : ''}`
            : `${count} resultado${count !== 1 ? 's' : ''}`;
        searchCount.style.display = 'block';
    } else {
        searchCount.style.display = 'none';
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupSearch();
    handleScrollAnimations();
    updateActiveLink();
});

// Event listeners
window.addEventListener('scroll', () => {
    handleScrollAnimations();
    updateActiveLink();
});

// Manejar el envío del formulario de contacto
document.getElementById('contactForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = {
        id: Date.now(),
        name: document.getElementById('nombre').value,
        email: document.getElementById('email').value,
        message: document.getElementById('mensaje').value,
        date: new Date().toISOString().split('T')[0],
        read: false
    };

    // Guardar en Firebase
    db.ref('messages').push(formData)
        .then(() => {
            // Mostrar notificación
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>Mensaje enviado, nos comunicaremos lo antes posible</span>
            `;
            document.body.appendChild(notification);

            setTimeout(() => notification.classList.add('show'), 100);
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
            
            this.reset();
        })
        .catch(error => {
            alert('Error al enviar el mensaje: ' + error.message);
        });
});

// Agregar al final del archivo
document.getElementById('toggleInfo')?.addEventListener('click', function() {
    const dropdown = document.getElementById('infoDropdown');
    dropdown.classList.toggle('active');
    
    // Cambiar el icono y texto del botón
    const icon = this.querySelector('i');
    if (dropdown.classList.contains('active')) {
        icon.className = 'fas fa-times';
        this.innerHTML = `${icon.outerHTML} Cerrar información`;
    } else {
        icon.className = 'fas fa-info-circle';
        this.innerHTML = `${icon.outerHTML} Información de contacto`;
    }
}); 