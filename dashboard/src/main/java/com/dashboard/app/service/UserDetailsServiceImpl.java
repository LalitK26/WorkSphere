package com.dashboard.app.service;

import com.dashboard.app.model.User;
import com.dashboard.app.repository.UserRepository;
import com.dashboard.app.recruitment.model.Candidate;
import com.dashboard.app.recruitment.model.RecruitmentUser;
import com.dashboard.app.recruitment.repository.CandidateRepository;
import com.dashboard.app.recruitment.repository.RecruitmentUserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private static final Logger logger = LoggerFactory.getLogger(UserDetailsServiceImpl.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private RecruitmentUserRepository recruitmentUserRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // First, try to find in regular users
        java.util.Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            return new org.springframework.security.core.userdetails.User(
                    user.getEmail(),
                    user.getPassword(),
                    new ArrayList<>()
            );
        }

        // If not found, try to find in candidates
        java.util.Optional<Candidate> candidateOpt = candidateRepository.findByEmail(email);
        if (candidateOpt.isPresent()) {
            Candidate candidate = candidateOpt.get();
            logger.debug("Loaded candidate user details for email: {}", email);
            return new org.springframework.security.core.userdetails.User(
                    candidate.getEmail(),
                    candidate.getPassword(),
                    new ArrayList<>()
            );
        }

        // If not found, try to find in recruitment users (recruiters/admins)
        java.util.Optional<RecruitmentUser> recruitmentUserOpt = recruitmentUserRepository.findByEmail(email);
        if (recruitmentUserOpt.isPresent()) {
            RecruitmentUser recruitmentUser = recruitmentUserOpt.get();
            logger.debug("Loaded recruitment user details for email: {}", email);
            return new org.springframework.security.core.userdetails.User(
                    recruitmentUser.getEmail(),
                    recruitmentUser.getPassword(),
                    new ArrayList<>()
            );
        }

        // If not found in any table, throw exception
        throw new UsernameNotFoundException("User not found with email: " + email);
    }
}

