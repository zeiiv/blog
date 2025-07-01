import gsap from "./vendor.js";
import { ANIM } from "./config.js";

/**
 * Animation Coordinator - inspired by TweenPages
 * Acts as a conductor orchestrating header animations and page transitions
 * Persists at window level to survive Barba.js page changes
 */
class AnimationCoordinator {
    constructor() {
        this.masterTimeline = gsap.timeline({ paused: true });
        this.currentPhase = 'idle'; // idle | preparing | coordinating | complete
        this.activeAnimations = new Map();
        this.pageTransitionCallbacks = [];
        this.coordinationId = null;
        this.pageTransitionActive = false; // Prevent cleanup during page transitions
        this.globalLock = false; // Global lock to prevent any new animations
        this.lockReason = null; // Debug info for why locked
        this.lockTimestamp = null; // When lock was engaged
        this.recentlyCompleted = false; // Flag to prevent reinitialization after completion
        this.completedTimestamp = null; // When coordination was completed
        
        console.log('[Coordinator] Animation coordinator initialized');
    }

    /**
     * Start a coordinated sequence (animation + page transition)
     * @param {Object} config - Coordination configuration
     * @param {gsap.Timeline} config.headerAnimation - Header animation timeline
     * @param {Function} config.pageTransitionTrigger - Function to trigger page transition
     * @param {string} config.coordinationId - Unique ID for this coordination
     */
    startCoordination({ headerAnimation, pageTransitionTrigger, coordinationId }) {
        console.log('[Coordinator] Starting coordination:', coordinationId);
        
        // Lock should already be engaged by the click handler
        // Don't try to engage again - just verify it's active
        if (!this.globalLock) {
            console.warn('[Coordinator] Starting coordination without active lock:', coordinationId);
            // Engage lock as fallback
            this.engageLock(`Coordination ${coordinationId} starting`);
        } else {
            console.log('[Coordinator] Using existing lock for coordination:', this.lockReason);
        }
        
        // Parallel cleanup: only clean up animations, let page transitions finish independently
        if (this.currentPhase !== 'idle') {
            console.log('[Coordinator] Parallel cleanup - stopping animations but preserving page transition state');
            this.parallelCleanup();
        }
        
        this.currentPhase = 'preparing';
        this.coordinationId = coordinationId;
        this._coordinationStartTime = Date.now();
        
        // Store the header animation
        this.activeAnimations.set('header', headerAnimation);
        
        // Create master timeline that coordinates both
        this.masterTimeline.clear();
        
        // Add header animation to master timeline
        this.masterTimeline.add(headerAnimation, 0);
        
        // Add minimal progress tracking for timing decisions
        this.masterTimeline.eventCallback("onUpdate", () => {
            const progress = this.masterTimeline.progress();
            // Store current progress for transition timing decisions
            this._currentProgress = progress;
            
            // Update phase based on progress for better timing
            if (progress > 0.1 && this.currentPhase === 'preparing') {
                this.currentPhase = 'coordinating';
            }
        });
        
        // Set up page transition trigger at optimal timing for overlap
        const triggerDelay = ANIM.getDuration('header') * 0.6; // 60% into header animation (more stable)
        
        this.masterTimeline.call(() => {
            // Double-check that we're still in a valid state for navigation
            if (this.currentPhase === 'preparing' || this.currentPhase === 'coordinating') {
                console.log('[Coordinator] Triggering page transition during header animation');
                this.currentPhase = 'coordinating';
                this.pageTransitionActive = true; // Flag that page transition is starting
                
                if (pageTransitionTrigger) {
                    try {
                        pageTransitionTrigger();
                    } catch (error) {
                        console.error('[Coordinator] Page transition trigger error:', error);
                    }
                }
            } else {
                console.log('[Coordinator] Skipping page transition - coordination no longer valid, phase:', this.currentPhase);
            }
        }, [], triggerDelay);
        
        // Set up cleanup when master timeline completes
        this.masterTimeline.eventCallback("onComplete", () => {
            console.log('[Coordinator] Master timeline completed naturally - cleaning up');
            // Release lock immediately when animation completes naturally
            this.releaseLock();
            this.cleanup();
        });
        
        // Extension rule: coordination cannot exceed header animation duration
        // This ensures coordination stays alive for the full header duration
        const headerDuration = headerAnimation.duration() || 0.6;
        const currentDuration = this.masterTimeline.duration();
        
        if (currentDuration < headerDuration) {
            const extensionNeeded = headerDuration - currentDuration;
            this.masterTimeline.to({}, { duration: extensionNeeded });
            console.log('[Coordinator] Extended timeline to match header duration:', {
                headerDuration,
                currentDuration,
                extensionNeeded
            });
        }
        
        // Start the master timeline
        this.masterTimeline.play();
        
        return this.masterTimeline;
    }

    /**
     * Check if coordination is currently active
     */
    isCoordinating() {
        return this.currentPhase === 'preparing' || this.currentPhase === 'coordinating';
    }

    /**
     * Check if coordination recently completed (within last 2 seconds)
     */
    recentlyCompletedCoordination() {
        if (!this.recentlyCompleted || !this.completedTimestamp) {
            return false;
        }
        const elapsed = Date.now() - this.completedTimestamp;
        return elapsed < 2000; // 2 second window
    }

    /**
     * Atomically engage the global lock
     */
    engageLock(reason = 'Unknown') {
        if (this.globalLock) {
            // Check if lock is stale (over 10 seconds old)
            const lockAge = Date.now() - (this.lockTimestamp || 0);
            if (lockAge > 10000) {
                console.warn('[Coordinator] Stale lock detected, force releasing:', this.lockReason, 'Age:', lockAge + 'ms');
                this.releaseLock();
            } else {
                console.log('[Coordinator] Lock already engaged:', this.lockReason);
                return false; // Lock was already engaged
            }
        }
        
        this.globalLock = true;
        this.lockReason = reason;
        this.lockTimestamp = Date.now();
        console.log('[Coordinator] Lock engaged:', reason);
        
        // Emergency release after 10 seconds to prevent permanent locks
        const engagedTimestamp = this.lockTimestamp;
        setTimeout(() => {
            if (this.globalLock && this.lockTimestamp === engagedTimestamp) {
                console.warn('[Coordinator] Emergency lock release after 10 seconds:', reason);
                this.releaseLock();
            }
        }, 10000);
        
        return true; // Successfully engaged lock
    }

    /**
     * Release the global lock
     */
    releaseLock() {
        if (!this.globalLock) {
            console.log('[Coordinator] Lock already released');
            return;
        }
        
        const duration = this.lockTimestamp ? Date.now() - this.lockTimestamp : 0;
        console.log('[Coordinator] Lock released after', duration + 'ms');
        
        this.globalLock = false;
        this.lockReason = null;
        this.lockTimestamp = null;
    }

    /**
     * Check if the global lock is active (blocks all new animations)
     */
    isLocked() {
        return this.globalLock;
    }

    /**
     * Get the reason for the current lock
     */
    getLockReason() {
        return this.lockReason;
    }

    /**
     * Check if a specific coordination is active
     */
    isCoordinationActive(coordinationId) {
        return this.coordinationId === coordinationId && this.isCoordinating();
    }

    /**
     * Get current coordination phase
     */
    getCurrentPhase() {
        return this.currentPhase;
    }

    /**
     * Get current coordination ID
     */
    getCurrentCoordinationId() {
        return this.coordinationId;
    }

    /**
     * Get current progress (0-1)
     */
    getCurrentProgress() {
        return this._currentProgress || 0;
    }

    /**
     * Register a callback to be called when page transition should start
     * Used by Barba.js hooks to know when to proceed
     */
    onPageTransition(callback) {
        if (this.currentPhase === 'coordinating' || this.currentPhase === 'complete') {
            // Already coordinating or complete, call immediately
            setTimeout(callback, 0);
        } else {
            // Store for later
            this.pageTransitionCallbacks.push(callback);
        }
    }

    /**
     * Get the master timeline for external monitoring
     */
    getMasterTimeline() {
        return this.masterTimeline;
    }

    /**
     * Get active animation by type
     */
    getActiveAnimation(type) {
        return this.activeAnimations.get(type);
    }

    /**
     * Complete coordination manually (called by page transition hooks)
     */
    completeCoordination() {
        const elapsed = this._coordinationStartTime ? Date.now() - this._coordinationStartTime : 0;
        console.log('[Coordinator] Coordination manually completed', {
            coordinationId: this.coordinationId,
            elapsed: elapsed + 'ms',
            progress: this._currentProgress,
            phase: this.currentPhase
        });
        this.currentPhase = 'complete';
        this.pageTransitionActive = false; // Page transition is now complete
        
        // Mark as recently completed to prevent premature reinitialization
        this.recentlyCompleted = true;
        this.completedTimestamp = Date.now();
        
        // Release lock when page transition completes
        this.releaseLock();
        
        // Notify any waiting page transition callbacks
        this.pageTransitionCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('[Coordinator] Page transition callback error:', error);
            }
        });
        
        // Don't cleanup immediately - let the master timeline finish naturally
        // The timeline will handle cleanup when it completes
        console.log('[Coordinator] Page transition complete, letting header animation finish naturally');
    }

    /**
     * Parallel cleanup - stops OLD animations but preserves page transition state
     * Allows new animations to start while old page transitions finish
     */
    parallelCleanup() {
        console.log('[Coordinator] Parallel cleanup - stopping OLD animations only');
        
        // Kill master timeline (stops OLD animations) but preserve completion callback if page transition active
        if (this.masterTimeline) {
            if (this.pageTransitionActive) {
                // If page transition is active, preserve the cleanup mechanism
                console.log('[Coordinator] Killing OLD animation timeline but preserving page transition cleanup');
                this.masterTimeline.kill();
                // Create a simple timeline that will handle cleanup when page transition completes
                this.masterTimeline = gsap.timeline({ paused: true });
                this.masterTimeline.eventCallback("onComplete", () => {
                    console.log('[Coordinator] Deferred cleanup from old page transition');
                    this.cleanup();
                });
            } else {
                // No active page transition, safe to kill completely
                this.masterTimeline.kill();
                this.masterTimeline = gsap.timeline({ paused: true });
            }
        }
        
        // Clear active animations (these are the OLD animations)
        this.activeAnimations.forEach((animation) => {
            if (animation && animation.kill) {
                animation.kill();
            }
        });
        this.activeAnimations.clear();
        
        // Reset animation-related state but preserve page transition state
        const oldCoordinationId = this.coordinationId;
        this.coordinationId = null;
        this._coordinationStartTime = null;
        this._currentProgress = 0;
        
        // Keep pageTransitionActive flag if it's set - let page transitions finish naturally
        if (!this.pageTransitionActive) {
            this.currentPhase = 'idle';
        } else {
            console.log('[Coordinator] Preserving page transition state from coordination:', oldCoordinationId);
        }
        
        console.log('[Coordinator] Parallel cleanup completed');
    }

    /**
     * Force cleanup of current coordination
     */
    cleanup(force = false) {
        // Prevent cleanup during active page transitions unless forced
        if (this.pageTransitionActive && !force) {
            console.log('[Coordinator] Cleanup requested but page transition active - deferring cleanup');
            return;
        }
        
        console.log('[Coordinator] Cleaning up coordination:', this.coordinationId, force ? '(forced)' : '');
        
        // Kill master timeline
        if (this.masterTimeline) {
            this.masterTimeline.kill();
            this.masterTimeline = gsap.timeline({ paused: true });
        }
        
        // Clear active animations
        this.activeAnimations.forEach((animation) => {
            if (animation && animation.kill) {
                animation.kill();
            }
        });
        this.activeAnimations.clear();
        
        // Clear callbacks
        this.pageTransitionCallbacks = [];
        
        // Reset state
        this.currentPhase = 'idle';
        this.coordinationId = null;
        this._coordinationStartTime = null;
        this._currentProgress = 0;
        this.pageTransitionActive = false;
        // DON'T reset recentlyCompleted flags during normal cleanup - keep them for transition detection
        if (force) {
            this.recentlyCompleted = false;
            this.completedTimestamp = null;
        }
        
        if (force) {
            // Immediate lock release for forced cleanup (page reloads, stuck states)
            this.releaseLock();
            console.log('[Coordinator] Global lock released immediately (forced cleanup)');
        } else {
            // Normal cleanup - lock should already be released by completion handlers
            if (this.globalLock) {
                console.log('[Coordinator] Lock still engaged during normal cleanup, releasing now');
                this.releaseLock();
            }
        }
        
        console.log('[Coordinator] Cleanup completed');
    }

    /**
     * Validate coordination state consistency
     */
    validateState() {
        const issues = [];
        
        // Check for timeline/phase mismatches
        if (this.currentPhase !== 'idle' && !this.coordinationId) {
            issues.push('Phase is not idle but no coordination ID');
        }
        
        if (this.currentPhase === 'idle' && this.activeAnimations.size > 0) {
            issues.push('Phase is idle but has active animations');
        }
        
        if (this.currentPhase !== 'idle' && this.masterTimeline.paused()) {
            issues.push('Coordination active but master timeline is paused');
        }
        
        // Check for stale coordination (running too long)
        if (this.coordinationId && this._coordinationStartTime) {
            const elapsed = Date.now() - this._coordinationStartTime;
            if (elapsed > 10000) { // 10 seconds is too long
                issues.push(`Coordination running too long: ${elapsed}ms`);
            }
        }
        
        if (issues.length > 0) {
            console.warn('[Coordinator] State validation issues:', issues);
            return false;
        }
        
        return true;
    }

    /**
     * Emergency stop - kills everything immediately
     */
    emergencyStop() {
        console.warn('[Coordinator] Emergency stop triggered');
        this.cleanup();
    }
}

// Create coordinator instance and attach to window (reuse existing if present)
let animationCoordinator;

if (window.wordplayCoordinator) {
    // Check if existing coordinator is in a valid state
    const existing = window.wordplayCoordinator;
    if (existing.pageTransitionActive || existing.currentPhase === 'coordinating' || existing.globalLock) {
        // Force cleanup of stuck coordinator and create fresh one
        console.log('[Coordinator] Found stuck coordinator (lock:', existing.globalLock, 'phase:', existing.currentPhase, '), forcing cleanup and creating new instance');
        existing.cleanup(true); // Force cleanup
        // Create completely new instance and immediately replace the window reference
        animationCoordinator = new AnimationCoordinator();
        window.wordplayCoordinator = animationCoordinator;
        console.log('[Coordinator] Created new coordinator instance (replacing stuck one)');
    } else {
        // Reuse existing coordinator instance
        animationCoordinator = existing;
        console.log('[Coordinator] Reusing existing coordinator instance, phase:', animationCoordinator.currentPhase);
    }
} else {
    // Create new coordinator instance
    animationCoordinator = new AnimationCoordinator();
    window.wordplayCoordinator = animationCoordinator;
    console.log('[Coordinator] Created new coordinator instance');
}

export { animationCoordinator };