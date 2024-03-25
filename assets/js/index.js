$("#add_user").submit(function (event) {
  // Prevent the default form submission
  event.preventDefault();

  // Capture form data
  var formData = $(this).serialize();

  // Show success message
  $("#alert-container").html(
    '<div class="p-4 mb-4 text-sm font-medium text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400" role="alert">' +
      '<span>Data Updated Successfully! Redirecting to home in <span id="countdown">5</span> seconds...</span>' +
      "</div>"
  );

  // Countdown timer for redirection
  var countdown = 5;
  var countdownInterval = setInterval(function () {
    countdown--;
    $("#countdown").text(countdown);
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      // Redirect to home page after countdown
      window.location.href = "/home";
    }
  }, 1000);

  // Send AJAX request or submit form data traditionally
  $.ajax({
    url: "/home/api/users", // Change the URL to your server endpoint
    method: "POST",
    data: formData,
    success: function (response) {
      // Handle success response if needed
    },
    error: function (xhr, status, error) {
      // Handle error response if needed
    },
  });
});

$("#update_user").submit(function (event) {
  event.preventDefault();

  var unindexed_array = $(this).serializeArray();
  var data = {};

  $.map(unindexed_array, function (n, i) {
    data[n["name"]] = n["value"];
  });

  var request = {
    url: `/home/api/users/${data.id}`,
    method: "PUT",
    data: data,
  };

  $.ajax(request).done(function (response) {
    var alertDiv = `
      <div class="p-4 mb-4 text-sm font-medium text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400" role="alert">
        <span>Data Updated Successfully! Redirecting to home in <span id="countdown">5</span> seconds...</span>
      </div>
    `;

    $("#alert-container").html(alertDiv);

    var countdown = 5;

    var countdownInterval = setInterval(function () {
      countdown--;
      $("#countdown").text(countdown);

      if (countdown <= 0) {
        clearInterval(countdownInterval);
        $("#alert-container").hide();
        window.location.href = "/home";
      }
    }, 1000);
  });
});

// DELETE
$(document).ready(function () {
  // Event listener for delete buttons
  $(document).on("click", ".btn.delete", function (event) {
    // Prevent the default action of the link
    event.preventDefault();

    // Log the event
    console.log("Delete button clicked");

    var id = $(this).data("id");
    console.log("Deleting user with ID:", id);

    if (confirm("Do you really want to delete this record?")) {
      var request = {
        url: `/home/api/users/${id}`,
        method: "DELETE",
      };

      console.log("Sending delete request:", request);

      $.ajax(request)
        .done(function (response) {
          console.log("Delete response:", response);
          alert("Data Deleted Successfully!");
          location.reload();
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
          console.error("Delete request failed:", errorThrown);
          alert("Failed to delete data. Please try again later.");
        });
    }
  });
});
