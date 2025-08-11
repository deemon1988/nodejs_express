
function initTinyMCE() {
    // Инициализация для поля content
    tinymce.init({
        selector: 'textarea#content',
        plugins: 'image code lists table',
        toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | image | bullist numlist | code',
        relative_urls: false,
        remove_script_host: false,
        convert_urls: true,
        images_upload_url: '/admin/upload-image',
        automatic_uploads: true,
        file_picker_types: 'image',
        image_title: true,
        content_style: 'img { max-width: 100%; height: auto; }'
    });

    // Инициализация для поля preview
    tinymce.init({
        selector: 'textarea#preview',
        plugins: 'code lists',
        toolbar: 'undo redo | bold italic | bullist numlist | code'
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initTinyMCE();
});