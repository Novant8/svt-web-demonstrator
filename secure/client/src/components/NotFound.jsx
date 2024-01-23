import { Link } from "react-router-dom";

export default function NotFound() {
    return (
      <div className="text-center">
        <h2>404 Not Found</h2>
        <p>Seems you're lost... <Link to="/">Go back to the homepage</Link></p>
      </div>
    )
}