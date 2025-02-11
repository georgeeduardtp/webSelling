document.addEventListener('DOMContentLoaded', function() {
    const reviewForm = document.getElementById('reviewForm');
    const reviewsList = document.getElementById('reviewsList');

    function loadReviews() {
        db.ref('reviews').orderByChild('status').equalTo('approved').on('value', (snapshot) => {
            reviewsList.innerHTML = '';
            const reviews = [];
            
            snapshot.forEach((child) => {
                reviews.push({
                    ...child.val(),
                    key: child.key
                });
            });
            
            reviews.sort((a, b) => b.timestamp - a.timestamp);
            
            reviews.forEach(review => {
                const date = new Date(review.timestamp);
                const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
                const reviewElement = document.createElement('div');
                reviewElement.className = 'review-card fade-in';
                reviewElement.innerHTML = `
                    <div class="review-header">
                        <span class="review-author">${review.nombre}</span>
                        <span class="review-date">${date.toLocaleDateString()}</span>
                    </div>
                    <div class="review-rating">${stars}</div>
                    <div class="review-subject">${review.asunto}</div>
                    <div class="review-content">${review.descripcion}</div>
                `;
                
                reviewsList.appendChild(reviewElement);
            });
        });
    }

    function deleteReview(reviewId) {
        db.ref(`reviews/${reviewId}`).remove()
            .then(() => {
                showNotification('Reseña eliminada correctamente');
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error al eliminar la reseña', 'error');
            });
    }

    // Función para verificar si el usuario es admin
    function isAdmin() {
        const authData = JSON.parse(localStorage.getItem('adminAuth'));
        return authData && authData.authenticated && authData.isAdmin;
    }

    // Función para mostrar notificaciones
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    reviewForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const rating = document.querySelector('input[name="rating"]:checked');
        if (!rating) {
            alert('Por favor, selecciona una calificación');
            return;
        }

        const reviewData = {
            nombre: document.getElementById('nombre').value,
            asunto: document.getElementById('asunto').value,
            rating: parseInt(rating.value),
            descripcion: document.getElementById('descripcion').value,
            timestamp: Date.now(),
            status: 'pending'
        };

        db.ref('reviews').push(reviewData)
            .then(() => {
                reviewForm.reset();
                showNotification('Gracias por la reseña');
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error al enviar la reseña: ' + error.message);
            });
    });

    loadReviews();
}); 