import React, { useState } from 'react';

const RentCalculator: React.FC = () => {
    const [monthlyRent, setMonthlyRent] = useState<number | ''>('');
    const [annualRent, setAnnualRent] = useState<number | ''>('');

    const handleMonthlyRentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        setMonthlyRent(isNaN(value) ? '' : value);
        setAnnualRent(isNaN(value) ? '' : value * 12);
    };

    const handleAnnualRentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        setAnnualRent(isNaN(value) ? '' : value);
        setMonthlyRent(isNaN(value) ? '' : value / 12);
    };

    return (
        <div>
            <h1>Rent Calculator</h1>
            <div>
                <label>
                    Monthly Rent:
                    <input
                        type="number"
                        value={monthlyRent}
                        onChange={handleMonthlyRentChange}
                        placeholder="Enter monthly rent"
                    />
                </label>
            </div>
            <div>
                <label>
                    Annual Rent:
                    <input
                        type="number"
                        value={annualRent}
                        onChange={handleAnnualRentChange}
                        placeholder="Enter annual rent"
                    />
                </label>
            </div>
        </div>
    );
};

export default RentCalculator;