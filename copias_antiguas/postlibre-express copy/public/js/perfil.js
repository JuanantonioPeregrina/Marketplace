document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('perfil-image');

    imageUpload.addEventListener('click', () => {
        window.location.href = '/editar-perfil';
    });
});
