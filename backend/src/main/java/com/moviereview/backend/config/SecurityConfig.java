package com.moviereview.backend.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.moviereview.backend.security.JwtAuthenticationFilter;
import com.moviereview.backend.security.OAuth2LoginSuccessHandler;
import com.moviereview.backend.service.CustomOAuth2UserService;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

	private final CustomOAuth2UserService customOAuth2UserService;
	private final com.moviereview.backend.service.CustomOidcUserService customOidcUserService;
	private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
	private final JwtAuthenticationFilter jwtAuthenticationFilter;
	private final ClientRegistrationRepository clientRegistrationRepository;

	public SecurityConfig(CustomOAuth2UserService customOAuth2UserService,
			com.moviereview.backend.service.CustomOidcUserService customOidcUserService,
			OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler,
			JwtAuthenticationFilter jwtAuthenticationFilter,
			ClientRegistrationRepository clientRegistrationRepository) {
		this.customOAuth2UserService = customOAuth2UserService;
		this.customOidcUserService = customOidcUserService;
		this.oAuth2LoginSuccessHandler = oAuth2LoginSuccessHandler;
		this.jwtAuthenticationFilter = jwtAuthenticationFilter;
		this.clientRegistrationRepository = clientRegistrationRepository;
	}

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

		http.cors(cors -> cors.configurationSource(corsConfigurationSource()));
		http.csrf(csrf -> csrf.disable());

		http.authorizeHttpRequests(auth -> auth
				.requestMatchers(HttpMethod.GET, "/api/users/**").permitAll()
				.requestMatchers("/", "/login**", "/error**", "/auth/**", "/ws/**", "/api/movies/**").permitAll()
				.anyRequest().authenticated());

		http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

		http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

		// OAuth2 Login
		http.oauth2Login(oauth2 -> oauth2
				.authorizationEndpoint(authorization -> authorization
						.authorizationRequestResolver(authorizationRequestResolver(clientRegistrationRepository)))
				.userInfoEndpoint(userInfo -> userInfo
						.userService(customOAuth2UserService)
						.oidcUserService(customOidcUserService))
				.successHandler(oAuth2LoginSuccessHandler));

		// Handle 401 instead of redirect for REST API
		http.exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)));

		return http.build();
	}

	private OAuth2AuthorizationRequestResolver authorizationRequestResolver(
			ClientRegistrationRepository clientRegistrationRepository) {

		DefaultOAuth2AuthorizationRequestResolver authorizationRequestResolver = new DefaultOAuth2AuthorizationRequestResolver(
				clientRegistrationRepository, "/oauth2/authorization");

		authorizationRequestResolver.setAuthorizationRequestCustomizer(
				authorizationRequest -> authorizationRequest
						.additionalParameters(params -> params.put("prompt", "consent")));

		return authorizationRequestResolver;
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration)
			throws Exception {
		return authenticationConfiguration.getAuthenticationManager();
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration configuration = new CorsConfiguration();
		configuration.setAllowedOrigins(List.of("http://localhost:5173", "http://localhost:5174"));
		configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
		configuration.setAllowedHeaders(List.of("*"));
		configuration.setAllowCredentials(true);
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", configuration);
		return source;
	}

}
