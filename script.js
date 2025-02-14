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
            
            // Si el enlace es a una sección en la misma página
            if (targetId.startsWith('#')) {
                const targetSection = document.querySelector(targetId);
                smoothScroll(targetSection, navOffset);
            } else {
                // Si el enlace es a otra página
                window.location.href = targetId;
            }
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

// Función para manejar la interacción táctil en tarjetas de servicios
function setupMobileServiceCards() {
    const servicioCards = document.querySelectorAll('.servicio-card');
    let activeCard = null;

    servicioCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Solo ejecutar en móvil
            if (window.innerWidth <= 768) {
                // Si hay una tarjeta activa y no es la actual, desactivarla
                if (activeCard && activeCard !== this) {
                    activeCard.classList.remove('active');
                }

                // Toggle la clase active en la tarjeta actual
                this.classList.toggle('active');
                activeCard = this.classList.contains('active') ? this : null;

                // Prevenir que el clic se propague si se hizo en el dropdown
                if (e.target.closest('.caracteristicas-dropdown')) {
                    e.stopPropagation();
                }
            }
        });
    });

    // Cerrar tarjeta activa al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && activeCard && !e.target.closest('.servicio-card')) {
            activeCard.classList.remove('active');
            activeCard = null;
        }
    });
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    const loader = document.querySelector('.loader-container');
    
    // Ocultar loader cuando la página esté completamente cargada
    window.addEventListener('load', () => {
        loader.classList.add('hidden');
    });

    // Mostrar loader cuando se navega entre secciones
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            loader.classList.remove('hidden');
            setTimeout(() => {
                loader.classList.add('hidden');
            }, 500);
        });
    });

    setupNavigation();
    setupSearch();
    setupMobileServiceCards();
    handleScrollAnimations();
    updateActiveLink();
});

// Event listeners
window.addEventListener('scroll', () => {
    handleScrollAnimations();
    updateActiveLink();
});

// Actualizar el manejo del formulario de contacto
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Deshabilitar el botón mientras se envía
            const submitButton = this.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            
            // Crear el objeto formData con todos los campos requeridos
            const formData = {
                id: Date.now(),
                name: document.getElementById('nombre').value,
                email: document.getElementById('email').value,
                message: document.getElementById('mensaje').value,
                timestamp: Date.now(),
                read: false // Campo requerido por las reglas
            };

            // Verificar que db está definido
            if (typeof db === 'undefined') {
                console.error('Firebase no está inicializado correctamente');
                alert('Error: No se pudo conectar con el servidor');
                submitButton.disabled = false;
                return;
            }

            // Guardar en Firebase
            db.ref('messages').push(formData)
                .then(() => {
                    // Mostrar notificación de éxito
                    const notification = document.createElement('div');
                    notification.className = 'notification';
                    notification.innerHTML = `
                        <i class="fas fa-check-circle"></i>
                        <span>Mensaje enviado correctamente</span>
                    `;
                    document.body.appendChild(notification);

                    // Animar la notificación
                    setTimeout(() => notification.classList.add('show'), 100);
                    
                    // Limpiar el formulario
                    this.reset();
                    
                    // Remover la notificación después de 3 segundos
                    setTimeout(() => {
                        notification.classList.remove('show');
                        setTimeout(() => notification.remove(), 3000);
                    }, 3000);
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error al enviar el mensaje: ' + error.message);
                })
                .finally(() => {
                    // Reactivar el botón
                    submitButton.disabled = false;
                });
        });
    }
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

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();

        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Agregar al final del archivo
function setupVideoCarousel() {
    const container = document.querySelector('.carousel-container');
    const slides = document.querySelectorAll('.carousel-slide');
    const dotsContainer = document.querySelector('.carousel-dots');
    const prevButton = document.querySelector('.carousel-button.prev');
    const nextButton = document.querySelector('.carousel-button.next');
    const videos = document.querySelectorAll('.carousel-slide video');
    
    let currentIndex = 0;
    
    // Crear dots
    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });
    
    // Funciones de navegación
    function goToSlide(index) {
        // Pausar todos los videos
        videos.forEach(video => {
            video.pause();
            video.currentTime = 0;
        });
        
        currentIndex = index;
        container.style.transform = `translateX(-${index * 100}%)`;
        updateDots();
        
        // Reproducir el video actual
        const currentVideo = videos[currentIndex];
        if (currentVideo) {
            currentVideo.play().catch(error => {
                console.log('Error al reproducir el video:', error);
                // Los navegadores pueden bloquear la reproducción automática
                // si el usuario no ha interactuado con la página
            });
        }
    }
    
    function updateDots() {
        document.querySelectorAll('.dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }
    
    // Event listeners para los botones
    prevButton.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        goToSlide(currentIndex);
    });
    
    nextButton.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % slides.length;
        goToSlide(currentIndex);
    });
    
    // Reproducir el primer video cuando la página cargue
    const firstVideo = videos[0];
    if (firstVideo) {
        firstVideo.play().catch(error => {
            console.log('Error al reproducir el primer video:', error);
        });
    }
}

// Llamar a la función cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    setupVideoCarousel();
});