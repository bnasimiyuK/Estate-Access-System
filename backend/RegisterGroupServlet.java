import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/registerGroup")
public class RegisterGroupServlet extends HttpServlet {

    private static final String DB_URL = "jdbc:sqlserver://localhost:1433;databaseName=EstateDB";
    private static final String DB_USER = "sa";
    private static final String DB_PASSWORD = "YourStrongPassword";

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        // Set response type
        response.setContentType("text/html;charset=UTF-8");

        // Get form parameters
        String groupName = request.getParameter("groupName");
        String purpose = request.getParameter("purpose");
        String visitDate = request.getParameter("visitDate");
        String hostId = request.getParameter("hostId");
        String members = request.getParameter("members");

        // Simple validation
        if (groupName == null || purpose == null || visitDate == null || hostId == null || members == null
                || groupName.trim().isEmpty() || purpose.trim().isEmpty() || visitDate.trim().isEmpty()
                || hostId.trim().isEmpty() || members.trim().isEmpty()) {
            response.getWriter().println("All fields are required!");
            return;
        }

        // Insert into database
        String sql = "INSERT INTO GroupAccess (GroupName, Purpose, VisitDate, HostID, Members) VALUES (?, ?, ?, ?, ?)";

        try (Connection conn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASSWORD);
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, groupName.trim());
            stmt.setString(2, purpose.trim());
            stmt.setString(3, visitDate.trim());
            stmt.setString(4, hostId.trim());
            stmt.setString(5, members.trim());

            int rows = stmt.executeUpdate();

            if (rows > 0) {
                response.getWriter().println("Group registered successfully!");
            } else {
                response.getWriter().println("Registration failed. Try again.");
            }

        } catch (SQLException e) {
            e.printStackTrace();
            response.getWriter().println("Database Error: " + e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            response.getWriter().println("Unexpected Error: " + e.getMessage());
        }
    }
}
