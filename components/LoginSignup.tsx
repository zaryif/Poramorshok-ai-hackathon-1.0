import React, { useState } from "react";
import { useLanguage } from "../hooks/useLanguage";
import { useUser } from "../contexts/UserContext";
import Icon from "./Icon";

interface LoginSignupProps {
	onBack: () => void;
}

const LoginSignup: React.FC<LoginSignupProps> = ({ onBack }) => {
	const { t } = useLanguage();
	const { login } = useUser();
	const [isLoginMode, setIsLoginMode] = useState(true);
	const [formData, setFormData] = useState({
		email: "",
		password: "",
		name: "",
		confirmPassword: "",
	});
	const [errors, setErrors] = useState<{ [key: string]: string }>({});
	const [isLoading, setIsLoading] = useState(false);

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		// Clear error when user starts typing
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: "" }));
		}

		// Real-time password confirmation validation
		if (
			field === "confirmPassword" &&
			value !== formData.password &&
			value.length > 0
		) {
			setErrors((prev) => ({
				...prev,
				confirmPassword: t("passwordMismatch"),
			}));
		} else if (
			field === "password" &&
			formData.confirmPassword &&
			value !== formData.confirmPassword
		) {
			setErrors((prev) => ({
				...prev,
				confirmPassword: t("passwordMismatch"),
			}));
		} else if (
			(field === "password" || field === "confirmPassword") &&
			value === formData.password
		) {
			setErrors((prev) => ({ ...prev, confirmPassword: "" }));
		}
	};

	const validateForm = () => {
		const newErrors: { [key: string]: string } = {};

		// Email validation
		if (!formData.email.trim()) {
			newErrors.email = t("fieldRequired");
		} else if (!/\S+@\S+\.\S+/.test(formData.email)) {
			newErrors.email = t("invalidEmail");
		}

		// Password validation
		if (!formData.password) {
			newErrors.password = t("fieldRequired");
		} else {
			// Enhanced password validation
			if (formData.password.length < 8) {
				newErrors.password = t("passwordMinLength8");
			} else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
				newErrors.password = t("passwordStrengthRequirement");
			}
		}

		if (!isLoginMode) {
			// Name validation for signup
			if (!formData.name.trim()) {
				newErrors.name = t("fieldRequired");
			} else if (formData.name.trim().length < 2) {
				newErrors.name = t("nameMinLength");
			}

			// Confirm password validation
			if (!formData.confirmPassword) {
				newErrors.confirmPassword = t("fieldRequired");
			} else if (formData.password !== formData.confirmPassword) {
				newErrors.confirmPassword = t("passwordMismatch");
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validateForm()) return;

		setIsLoading(true);

		// Simulate API call delay
		setTimeout(() => {
			setIsLoading(false);

			if (isLoginMode) {
				// For login, use mock authentication (in real app, this would verify credentials)
				login();
			} else {
				// For signup, pass the actual user data
				login({
					name: formData.name.trim(),
					email: formData.email.trim().toLowerCase(),
				});
			}

			onBack(); // Return to settings after successful login/signup
		}, 1500); // Slightly longer delay to show loading state
	};

	const handleGoogleLogin = () => {
		setIsLoading(true);
		// Simulate Google OAuth delay
		setTimeout(() => {
			setIsLoading(false);
			login();
			onBack();
		}, 1000);
	};

	return (
		<div className="space-y-6 animate-fade-in-up py-6">
			<style>{`
                .input-style {
                    display: block;
                    width: 100%;
                    border-radius: 0.375rem;
                    border-width: 1px;
                    border-color: #d1d5db; /* gray-300 */
                    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                    padding: 0.625rem;
                    background-color: #f9fafb; /* gray-50 */
                    transition-property: border-color, box-shadow;
                    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                    transition-duration: 150ms;
                }
                .dark .input-style {
                    border-color: #3f3f46; /* zinc-700 */
                    background-color: #27272a; /* zinc-800 */
                    color: #d1d5db; /* gray-300 */
                }
                .input-style:focus {
                    outline: none;
                    border-color: #14b8a6; /* teal-500 */
                    --tw-ring-color: #14b8a6; /* teal-500 */
                    --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
                    --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
                    box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
                }
                .form-button-secondary {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0.5rem 1rem;
                    border: 1px solid #d1d5db; /* gray-300 */
                    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                    font-size: 0.875rem;
                    line-height: 1.25rem;
                    font-weight: 500;
                    border-radius: 0.375rem;
                    color: #374151; /* gray-700 */
                    background-color: white;
                    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
                    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                    transition-duration: 150ms;
                }
                .dark .form-button-secondary {
                    border-color: #3f3f46; /* zinc-700 */
                    color: #d1d5db; /* gray-300 */
                    background-color: #27272a; /* zinc-800 */
                }
                .form-button-secondary:hover {
                    background-color: #f9fafb; /* gray-50 */
                }
                .dark .form-button-secondary:hover {
                    background-color: #3f3f46; /* zinc-700 */
                }
            `}</style>

			{/* Header with back button */}
			<div className="flex items-center gap-4">
				<button
					onClick={onBack}
					className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
					aria-label={t("back")}
				>
					<Icon name="arrow-left" className="h-5 w-5" />
				</button>
				<div>
					<h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
						{isLoginMode ? t("login") : t("signUp")}
					</h2>
					<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
						{isLoginMode ? t("loginDescription") : t("signUpDescription")}
					</p>
				</div>
			</div>

			{/* Main login/signup card */}
			<div className="max-w-md mx-auto">
				<div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200/80 dark:border-gray-700/80">
					{/* Google Sign In Button */}
					<button
						onClick={handleGoogleLogin}
						disabled={isLoading}
						className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:opacity-60 font-medium"
					>
						{isLoading ? (
							<div className="h-5 w-5 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin" />
						) : (
							<Icon name="google" className="h-5 w-5" />
						)}
						{isLoginMode ? t("continueWithGoogle") : t("signUpWithGoogle")}
					</button>

					{/* Divider */}
					<div className="relative my-6">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-gray-300 dark:border-gray-600" />
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
								{t("or")}
							</span>
						</div>
					</div>

					{/* Form */}
					<form onSubmit={handleSubmit} className="space-y-4">
						{!isLoginMode && (
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									{t("fullName")}
								</label>
								<input
									type="text"
									value={formData.name}
									onChange={(e) => handleInputChange("name", e.target.value)}
									placeholder={t("enterYourName")}
									className="input-style"
								/>
								{errors.name && (
									<p className="text-red-500 text-xs mt-1">{errors.name}</p>
								)}
							</div>
						)}

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
								{t("emailAddress")}
							</label>
							<input
								type="email"
								value={formData.email}
								onChange={(e) => handleInputChange("email", e.target.value)}
								placeholder={t("enterYourEmail")}
								className="input-style"
							/>
							{errors.email && (
								<p className="text-red-500 text-xs mt-1">{errors.email}</p>
							)}
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
								{t("password")}
							</label>
							<input
								type="password"
								value={formData.password}
								onChange={(e) => handleInputChange("password", e.target.value)}
								placeholder={t("enterYourPassword")}
								className="input-style"
							/>
							{!isLoginMode && formData.password && (
								<div className="mt-2">
									<div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
										{t("passwordStrength")}:
									</div>
									<div className="flex gap-1 mb-1">
										<div
											className={`h-1 flex-1 rounded ${
												formData.password.length >= 8
													? "bg-green-500"
													: "bg-gray-300"
											}`}
										></div>
										<div
											className={`h-1 flex-1 rounded ${
												/[A-Z]/.test(formData.password)
													? "bg-green-500"
													: "bg-gray-300"
											}`}
										></div>
										<div
											className={`h-1 flex-1 rounded ${
												/[a-z]/.test(formData.password)
													? "bg-green-500"
													: "bg-gray-300"
											}`}
										></div>
										<div
											className={`h-1 flex-1 rounded ${
												/\d/.test(formData.password)
													? "bg-green-500"
													: "bg-gray-300"
											}`}
										></div>
									</div>
									<div className="text-xs text-gray-500 dark:text-gray-400">
										<div
											className={
												formData.password.length >= 8
													? "text-green-600 dark:text-green-400"
													: ""
											}
										>
											• {t("atLeast8Characters")}
										</div>
										<div
											className={
												/[A-Z]/.test(formData.password)
													? "text-green-600 dark:text-green-400"
													: ""
											}
										>
											• {t("oneUppercase")}
										</div>
										<div
											className={
												/[a-z]/.test(formData.password)
													? "text-green-600 dark:text-green-400"
													: ""
											}
										>
											• {t("oneLowercase")}
										</div>
										<div
											className={
												/\d/.test(formData.password)
													? "text-green-600 dark:text-green-400"
													: ""
											}
										>
											• {t("oneNumber")}
										</div>
									</div>
								</div>
							)}
							{errors.password && (
								<p className="text-red-500 text-xs mt-1">{errors.password}</p>
							)}
						</div>

						{!isLoginMode && (
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									{t("confirmPassword")}
								</label>
								<div className="relative">
									<input
										type="password"
										value={formData.confirmPassword}
										onChange={(e) =>
											handleInputChange("confirmPassword", e.target.value)
										}
										placeholder={t("confirmYourPassword")}
										className="input-style pr-10"
									/>
									{formData.confirmPassword && formData.password && (
										<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
											{formData.password === formData.confirmPassword ? (
												<Icon name="check" className="h-5 w-5 text-green-500" />
											) : (
												<Icon name="x" className="h-5 w-5 text-red-500" />
											)}
										</div>
									)}
								</div>
								{errors.confirmPassword && (
									<p className="text-red-500 text-xs mt-1">
										{errors.confirmPassword}
									</p>
								)}
								{formData.confirmPassword &&
									formData.password === formData.confirmPassword &&
									!errors.confirmPassword && (
										<p className="text-green-600 dark:text-green-400 text-xs mt-1">
											{t("passwordsMatch")}
										</p>
									)}
							</div>
						)}

						{/* Submit Button */}
						<button
							type="submit"
							disabled={isLoading}
							className="w-full bg-teal-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
						>
							{isLoading ? (
								<div className="flex items-center justify-center gap-2">
									<div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
									{isLoginMode ? t("signingIn") : t("creatingAccount")}
								</div>
							) : isLoginMode ? (
								t("signIn")
							) : (
								t("createAccount")
							)}
						</button>
					</form>

					{/* Toggle between login/signup */}
					<div className="mt-6 text-center">
						<p className="text-sm text-gray-600 dark:text-gray-400">
							{isLoginMode ? t("dontHaveAccount") : t("alreadyHaveAccount")}{" "}
							<button
								onClick={() => {
									setIsLoginMode(!isLoginMode);
									setFormData({
										email: "",
										password: "",
										name: "",
										confirmPassword: "",
									});
									setErrors({});
								}}
								className="text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 font-medium transition-colors"
							>
								{isLoginMode ? t("signUp") : t("signIn")}
							</button>
						</p>
					</div>

					{/* Demo notice */}
					<div className="mt-6 p-3 bg-teal-50 dark:bg-teal-900/30 rounded-lg border border-teal-200 dark:border-teal-700/50">
						<div className="flex items-start gap-2">
							<Icon
								name="info"
								className="h-5 w-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5"
							/>
							<div>
								<p className="text-sm font-medium text-teal-800 dark:text-teal-300">
									{t("demoModeTitle")}
								</p>
								<p className="text-xs text-teal-700 dark:text-teal-400 mt-1">
									{t("demoModeDescription")}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default LoginSignup;
