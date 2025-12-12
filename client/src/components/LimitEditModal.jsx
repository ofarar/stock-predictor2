import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import useLockBodyScroll from '../hooks/useLockBodyScroll';

const LimitEditModal = ({ isOpen, onClose, onSave, user, currentHourlyLimit }) => {
    useLockBodyScroll(isOpen);
    const [hourlyLimit, setHourlyLimit] = useState('');

    useEffect(() => {
        if (isOpen) {
            setHourlyLimit(currentHourlyLimit !== null && currentHourlyLimit !== undefined ? currentHourlyLimit : '');
        }
    }, [isOpen, currentHourlyLimit]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        // If empty string, pass null to reset to default
        const valueToSave = hourlyLimit === '' ? null : parseInt(hourlyLimit, 10);
        onSave(valueToSave);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-700 transform transition-all scale-100">
                <h3 className="text-xl font-bold text-white mb-4">Edit Hourly Rate Limit</h3>

                <p className="text-gray-400 text-sm mb-6">
                    Set the maximum number of predictions <strong>{user?.username}</strong> can make per hour.
                    Leave empty to use the global default.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-gray-400 text-sm font-semibold mb-2">
                            Hourly Limit (Predictions/Hour)
                        </label>
                        <input
                            type="number"
                            min="0"
                            className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-600"
                            placeholder="Default (10)"
                            value={hourlyLimit}
                            onChange={(e) => setHourlyLimit(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/30 transition-all"
                        >
                            Save Limit
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

LimitEditModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    user: PropTypes.shape({
        username: PropTypes.string
    }),
    currentHourlyLimit: PropTypes.number
};

export default LimitEditModal;
