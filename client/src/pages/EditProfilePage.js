// src/pages/EditProfilePage.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const EditProfilePage = ({ onProfileUpdate }) => {
    const [formData, setFormData] = useState({
        username: '',
        about: '',
        youtubeLink: '',
        xLink: '',
        avatar: ''
    });
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false); // 1. Add saving state

    const avatarStyles = ['adventurer', 'pixel-art', 'bottts', 'initials', 'fun-emoji', 'identicon'];

    const getAvatarUrl = useCallback((style, name) => {
        return `https://api.dicebear.com/8.x/${style}/svg?seed=${name || 'default'}`;
    }, []);

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true })
            .then(res => {
                if (res.data) {
                    const initialUsername = res.data.username || 'User';
                    setUser(res.data);
                    setFormData({
                        username: initialUsername,
                        about: res.data.about || '',
                        youtubeLink: res.data.youtubeLink || '',
                        xLink: res.data.xLink || '',
                        avatar: res.data.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${initialUsername}`
                    });
                } else {
                    navigate('/login');
                }
            });
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const newFormData = { ...formData, [name]: value };
        if (name === 'username') {
            const currentStyle = formData.avatar.split('/')[4] || 'adventurer';
            newFormData.avatar = getAvatarUrl(currentStyle, value);
        }
        setFormData(newFormData);
    };

    const handleAvatarSelect = (style) => {
        setFormData({ ...formData, avatar: getAvatarUrl(style, formData.username) });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true); // 2. Set saving to true on submit
        axios.put(`${process.env.REACT_APP_API_URL}/api/profile`, formData, { withCredentials: true })
            .then(res => {
                toast.success('Profile updated successfully!');
                onProfileUpdate();
                navigate(`/profile/${user._id}`);
            })
            .catch(err => {
                console.error("Profile update error:", err);
                toast.error('Failed to update profile.');
            })
            .finally(() => {
                setIsSaving(false); // 3. Set saving to false when API call finishes
            });
    };

    return (
        <div className="max-w-2xl mx-auto bg-gray-800 p-8 rounded-lg">
            <h1 className="text-3xl font-bold text-white mb-6">Edit Your Profile</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar and other form fields remain the same... */}
                <div>
                    <label className="block text-sm font-medium text-gray-300">Select Avatar Style</label>
                    <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-4">
                        {avatarStyles.map(style => (
                            <div key={style} onClick={() => handleAvatarSelect(style)}
                                className={`p-2 rounded-full cursor-pointer transition-all duration-200 ${formData.avatar.includes(style) && formData.avatar.includes(formData.username) ? 'bg-green-500' : 'bg-gray-700'}`}>
                                <img
                                    src={getAvatarUrl(style)}
                                    alt={`${style} avatar`}
                                    className="w-16 h-16 rounded-full bg-white"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-300">Username</label>
                    <input type="text" name="username" id="username" value={formData.username} onChange={handleChange}
                        className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                </div>
                <div>
                    <label htmlFor="about" className="block text-sm font-medium text-gray-300">About</label>
                    <textarea name="about" id="about" rows="4" value={formData.about} onChange={handleChange}
                        className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"></textarea>
                </div>

                <div>
                    <label htmlFor="xLink" className="block text-sm font-medium text-gray-300">X (Twitter) Link</label>
                    <input type="url" name="xLink" id="xLink" placeholder="https://x.com/yourprofile" value={formData.xLink} onChange={handleChange}
                        className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                </div>
                <div>
                    <label htmlFor="youtubeLink" className="block text-sm font-medium text-gray-300">YouTube Link</label>
                    <input type="url" name="youtubeLink" id="youtubeLink" placeholder="https://youtube.com/yourchannel" value={formData.youtubeLink} onChange={handleChange}
                        className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                </div>
                
                {/* 4. Update the button with disabled state and conditional text */}
                <button 
                    type="submit" 
                    disabled={isSaving}
                    className="w-full flex justify-center items-center bg-green-500 text-white font-bold py-3 px-4 rounded-md hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </form>
        </div>
    );
};

export default EditProfilePage;