// Hide and unset success or error messages after 3 seconds
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        var successMessage = document.getElementById("success-message");
        if (successMessage) {
            successMessage.style.opacity = '0'; // Fade out by setting opacity to 0
        }
        var errorMessage = document.getElementById("error-message");
        if (errorMessage) {
            errorMessage.style.opacity = '0'; // Fade out by setting opacity to 0
        }
        // After 5 seconds, unset the messages
        setTimeout(function() {
            if (successMessage) {
                successMessage.remove(); // Remove the element from the DOM
            }
            if (errorMessage) {
                errorMessage.remove(); // Remove the element from the DOM
            }
        }, 5000); // Delay unset to ensure transition effect completes
    }, 3000);
});



