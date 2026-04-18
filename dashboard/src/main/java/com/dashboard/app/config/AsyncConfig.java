package com.dashboard.app.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.lang.reflect.Method;
import java.util.concurrent.Executor;

/**
 * Configuration for asynchronous task execution.
 * Enables @Async support and defines a thread pool specifically for email tasks.
 * Implements AsyncConfigurer to provide custom exception handling for async methods.
 */
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    private static final Logger logger = LoggerFactory.getLogger(AsyncConfig.class);

    @Bean(name = "emailTaskExecutor")
    public Executor emailTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // Core pool size: threads that are always active
        executor.setCorePoolSize(50);
        // Max pool size: maximum threads to create if queue is full
        executor.setMaxPoolSize(100);
        // Queue capacity: tasks to hold before creating more threads (up to max)
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("EmailTask-");
        // Reject policy: CallerRunsPolicy ensures emails are still sent if queue is full
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        logger.info("Initialized emailTaskExecutor with core={}, max={}, queue={}", 50, 100, 500);
        return executor;
    }

    @Override
    public Executor getAsyncExecutor() {
        return emailTaskExecutor();
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return new AsyncUncaughtExceptionHandler() {
            @Override
            public void handleUncaughtException(Throwable ex, Method method, Object... params) {
                logger.error("Async method '{}' threw exception: {}", method.getName(), ex.getMessage(), ex);
                // Log additional details for email-related methods
                if (method.getName().contains("Email") || method.getName().contains("email") || 
                    method.getName().contains("Notification") || method.getName().contains("notification")) {
                    logger.error("Email async task failed - Method: {}, Params: {}", 
                        method.getName(), java.util.Arrays.toString(params));
                }
            }
        };
    }
}
