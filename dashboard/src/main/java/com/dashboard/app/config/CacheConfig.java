package com.dashboard.app.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager cacheManager = new SimpleCacheManager();
        
        // Default cache configuration for most caches
        Caffeine<Object, Object> defaultCache = Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .recordStats();
        
        // Custom configuration for proctoring cache - expires after 4 hours
        // This covers typical interview duration (1-2 hours) plus buffer time
        Caffeine<Object, Object> proctoringCache = Caffeine.newBuilder()
            .maximumSize(500) // Maximum 500 active interview sessions
            .expireAfterWrite(4, TimeUnit.HOURS) // Auto-expire after 4 hours
            .recordStats();
        
        // Create individual cache instances with their specific configurations
        cacheManager.setCaches(Arrays.asList(
            new CaffeineCache("employees", defaultCache.build()),
            new CaffeineCache("attendance", defaultCache.build()),
            new CaffeineCache("permissions", defaultCache.build()),
            new CaffeineCache("departments", defaultCache.build()),
            new CaffeineCache("designations", defaultCache.build()),
            new CaffeineCache("roles", defaultCache.build()),
            new CaffeineCache("shiftRoster", defaultCache.build()),
            new CaffeineCache("proctoring", proctoringCache.build())
        ));
        
        return cacheManager;
    }
}
