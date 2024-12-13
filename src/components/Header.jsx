const Header = ({ isComplete = true }) => {
  return (
    <header className="text-center mb-4 mt-8">
      <img
        src="/logo.jpg"
        alt="Harvesters International Christian Center Logo"
        className="w-32 h-16 mx-auto object-contain"
      />
      {isComplete && (
        <div>
          <h1 className="text-2xl font-bold mt-4">
            Harvesters International Christian Centre, Gbagada campus
          </h1>
          <h2 className="text-xl font-bold text-gray-500 mt-4">
            Worker's Ball 2024 Registration
          </h2>
        </div>
      )}
    </header>
  );
};

export default Header;
