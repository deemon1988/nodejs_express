//  <script>
tinymce.init({
    selector: 'textarea#content',
    plugins: 'image code lists table',
    toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | image | bullist numlist | code',
    relative_urls: false,         // <-- отключить относительные пути
    remove_script_host: false,    // <-- оставить host в URL
    convert_urls: true,           // <-- включить преобразование (но с учетом настроек выше)
    images_upload_url: '/admin/upload-image',
    automatic_uploads: true,
    file_picker_types: 'image',
    image_title: true,
    content_style: 'img { max-width: 100%; height: auto; }'
});

tinymce.init({
    selector: 'textarea#preview',
    plugins: 'code lists',
    toolbar: 'undo redo | bold italic | bullist numlist | code'
});
// </script>