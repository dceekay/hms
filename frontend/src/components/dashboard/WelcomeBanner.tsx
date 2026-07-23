import "./welcome.css";

export default function WelcomeBanner() {

    const hour = new Date().getHours();

    const greeting =
        hour < 12
            ? "Good Morning"
            : hour < 18
            ? "Good Afternoon"
            : "Good Evening";

    return (

        <div className="welcome-banner">

            <div>

                <h1>{greeting}, Mohammad 👋</h1>

                <p>
                    Welcome back to CeekayX HMS Enterprise
                </p>

            </div>

            <div className="today-box">

                <h3>
                    {new Date().toLocaleDateString(undefined,{
                        weekday:"long",
                        day:"numeric",
                        month:"long",
                        year:"numeric"
                    })}
                </h3>

            </div>

        </div>

    );

}